import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../services/room.service';
import { Subscription } from 'rxjs';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import { GameService } from '../services/game.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {

  roomId: string;
  roomName: string = "";
  gameRef: firebase.database.Reference;
  playerName: string;

  cards: Array<string>=[];
  cardTheme: string;
  canPickCard: boolean = true;

  currentCard: string = "";
  currentPlayer: string;
  playersList: Array<{name: string, cards: number}>=[];
  playersSubscription: Subscription;
  canPlay: boolean = false;

  isSelectingColor: boolean = false;
  selectedColor: string = "";
  colorCard: {name: string, index: number};

  forcedColor: string;
  isStackingCard: boolean = false;

  constructor(private activatedRoute: ActivatedRoute, private roomService: RoomService, private gameService: GameService, private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    this.roomId = this.activatedRoute.snapshot.params['id'];
    console.log("connect room : "+this.roomId);
    this.roomService.connect(this.roomId).then(
      (Ref)=>{
        this.gameRef = Ref;
        this.playerName = firebase.auth().currentUser.displayName;
        this.cards=[];
        this.playersList=[];
        this.cardTheme = this.authService.userPreferences.cards;

        for(let index = 0; index < 7; index++){
          this.onPickCard(true);
        }
        //update currentCard
        this.gameRef.child("current_card").on("value",
        (current_card_snapshot)=>{
          this.currentCard = current_card_snapshot.val();
        });
        //update players list
        this.playersSubscription = this.roomService.playersSubject.subscribe((players)=>{
          this.playersList = players;
        });

        //update current player
        this.gameRef.child("current_player").on("value",
          (current_player_snapshot)=>{
            this.currentPlayer = current_player_snapshot.val();
            //check if is player turn and if it is update action
            if(this.currentPlayer==this.playerName){
              this.gameRef.child("action_card").once("value",
                (action_card_snapshot)=>{
                  //check if color is forced
                  this.gameRef.child("forced_color").once("value",
                  (forced_color_snapshot)=>{
                    if(forced_color_snapshot.val()){
                      this.forcedColor = forced_color_snapshot.val();
                    }
                  });
                  //check is action_card is defined
                  if(action_card_snapshot.val()){
                    const action_card: string = action_card_snapshot.val();
                    if(action_card=="skip_turn"){
                      this.gameRef.child("action_card").remove().then(
                        ()=>{
                          this.roomService.updateTurn(this.cards.length);
                        }
                      );
                    }else if(action_card.includes("pick")){
                      const pickValue = action_card.split("_")[1];
                      this.cards.forEach(
                        (card)=>{ if(card.includes(this.currentCard.split("_")[this.currentCard.split("_").length - 1]) && !card.includes("color")){ this.isStackingCard = true; console.log("stack card")} }
                      );
                      if(!this.isStackingCard){
                        for (let index = 0; index < parseInt(pickValue); index++) {
                          this.onPickCard(true);
                        }
                        this.gameRef.child("action_card").remove().then(
                          ()=>{
                            this.roomService.updateTurn(this.cards.length);
                          }
                        );
                      }
                    }
                  }else{
                    this.canPlay = true;
                  }
              });
            }
          });
      },
      ()=>{
        console.log("connect failed !");
        this.router.navigate(['/menu']);
      }
    );
    window.onbeforeunload = () => this.ngOnDestroy();
  }
  //pick a card
  onPickCard(skip: boolean = false){
    if(this.canPlay || skip){
      this.roomService.pickCard().then(
        (card: string)=>{
          this.cards.push(card);
          if(!skip){
            if(!this.canPlayCard(card)){
              this.canPlay = false;
              this.roomService.updateTurn(this.cards.length);
            }
          }
        },
        (error)=>{
          this.onPickCard();
        }
      );
    }
  }
  //play with card
  onPutCard(index: number, name: string){
    if(this.canPlay){
      if(this.forcedColor && name.includes(this.forcedColor)){
        this.playCard(index, name);
      }else if(name.includes("wild")){
        this.isSelectingColor=true;
        this.colorCard={name: name, index: index};
      }else{
        const names = name.split("_");
        const color = names[0];
        const value = names[1];
        if(this.currentCard.includes(color) || this.currentCard.includes(value)){
          this.playCard(index, name);
        }
      }
    }else if(this.isStackingCard){
      if(name.includes("wild_pick") && this.currentCard.includes("wild_pick")){
        this.isSelectingColor=true;
        this.colorCard={name: name, index: index};
      }else if(this.currentCard.includes("picker") && name.includes("picker")){
        this.playCard(index, name);
      }
    }
  }

  playCard(index: number, name: string){
    this.isSelectingColor=false;
    this.actionCard(name).then(
      ()=>{
        this.putCard(name);
        this.cards.splice(index, 1);
        this.roomService.updateTurn(this.cards.length);
      }
    );
  }

  canPlayCard(name:string):boolean{
    if(name.includes("wild")){
      return true;
    }else{
      const names = name.split("_");
      const color = names[0];
      const value = names[1];
      if(this.currentCard.includes(color) || this.currentCard.includes(value)){
        return true;
      }else if(this.forcedColor==color){
        return true;
      }else{
        return false;
      }
    }
  }
  //put card and update current_card
  putCard(card: string){
    this.gameRef.child("current_card").once("value",
      (dataSnapshot)=>{
        if(this.forcedColor){
          this.forcedColor = null;
          this.gameRef.child("forced_color").remove();
        }
        const oldCard = dataSnapshot.val();
        this.gameRef.child("cards").push(oldCard);
        this.gameRef.child("current_card").set(card);
        this.canPlay=false;
        this.isStackingCard = false;
    });
  }
  //select a color
  selectColor(color: string){
    if(this.isSelectingColor){
      this.selectedColor=color;
      this.actionCard(this.colorCard.name).then(
        ()=>{
          this.putCard(this.colorCard.name);
          this.cards.splice(this.colorCard.index, 1);
          this.roomService.updateTurn(this.cards.length);
        }
      );
      this.isSelectingColor=false;
    }
  }
  //apply acion for special card
  actionCard(name: string){
    return new Promise(
      (resolve)=>{
        if(name.includes("reverse")){
          this.gameService.reverseCard(this.gameRef).then(()=>{ resolve(); });
        }else if(name.includes("skip")){
          this.gameService.skipCard(this.gameRef).then(()=>{ resolve(); });
        }else if(name.includes("picker")){
          this.gameService.pick2Card(this.gameRef).then(()=>{ resolve(); });
        }else if(name.includes("four")){
          this.gameService.pick4Card(this.gameRef, this.selectedColor).then(()=>{ resolve(); });
        }else if(name.includes("color")){
          this.gameService.changeColor(this.gameRef, this.selectedColor).then(()=>{ resolve(); });
        }else{
          resolve();
        }
      }
    );
  }

  ngOnDestroy(){
    if(this.playersSubscription){
      this.playersSubscription.unsubscribe();
    }
    this.roomService.disconnect();
  }
}
