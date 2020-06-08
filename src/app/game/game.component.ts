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
  playerName: string;
  gameRef: firebase.database.Reference;
  uno: boolean = false;

  inGame: boolean;
  isAdmin = false;
  score: number = 0;

  cards: Array<string>=[];
  sortedCards : Array<string>=[];
  cardTheme: string="flat";
  canPickCard: boolean = true;

  currentCard: string = "";
  currentPlayer: string;
  playersList: Array<{name: string, cards: number, score: number}>=[];
  playersSubscription: Subscription;
  playersUpdateSubscription: Subscription;
  turn: number = 1;
  turnSubscription: Subscription;

  canPlay: boolean = false;
  hasPickCard: boolean = false;

  isSelectingColor: boolean = false;
  selectedColor: string = "";
  colorCard: {name: string, index: number};

  forcedColor: string;
  isStackingCard: boolean = false;

  constructor(private activatedRoute: ActivatedRoute, private roomService: RoomService, private gameService: GameService, private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    if(this.authService.userPreferences){
      this.cardTheme = this.authService.userPreferences.cards;
    }else{
      this.authService.getUserPreferences().then(
        ()=>{ this.cardTheme = this.authService.userPreferences.cards; },
        (error)=>{ console.log(error); }
      );
    }
    this.roomId = this.activatedRoute.snapshot.params['id'];
    const conf = this.activatedRoute.snapshot.params['conf'];
    this.roomService.connect(this.roomId, conf).then(
      (Ref)=>{
        this.gameRef = Ref;
        this.cards=[];
        this.playersList=this.roomService.players;
        this.isAdmin = this.roomService.isAdmin;
        this.playerName=firebase.auth().currentUser.displayName;
        //update currentCard
        this.gameRef.child("current_card").on("value",
        (current_card_snapshot)=>{
          const current_card = current_card_snapshot.val();
          if(current_card){
            if(!this.inGame){
              this.cards=[];
              for(let index = 0; index < 7; index++){
                this.onPickCard(true);
              }
              this.inGame=true;
            }
            this.currentCard = current_card;
          }else{
            if(this.inGame && this.roomService.isConnect){
              this.inGame=false;
              for(let card of this.cards){
                if(card.includes("wild")){
                  this.score+=50;
                }else if(card.includes("skip") || card.includes("reverse") || card.includes("picker")){
                  this.score+=20
                }else{
                  this.score+=parseInt(card.split("_")[1]);
                }
              }
              this.roomService.playerRef.update({score: this.score});
            }
          }
        });
        //update forced color
        this.gameRef.child("forced_color").on("value",
        (forced_color_snapshot)=>{
          this.forcedColor = forced_color_snapshot.val() ? forced_color_snapshot.val() : null;
        });

        //update players list
        this.playersSubscription = this.roomService.playersSubject.subscribe((players)=>{
          this.playersList = players;
        });
        this.playersUpdateSubscription = this.roomService.playerUpdateSubject.subscribe((playersUpdate)=>{
          const playerIndex = this.playersList.map(function(e) { return e.name; }).indexOf(playersUpdate.name);
          this.playersList[playerIndex].cards = playersUpdate.cards;
          this.playersList[playerIndex].score = playersUpdate.score;
          if(this.playersList[playerIndex].name==this.playerName){
            if((this.uno != playersUpdate.uno) && this.cards.length==1){
              for(let i = 0; i< 2; i++){
                this.onPickCard(true);
              }
              this.uno= false;
              this.roomService.playerRef.update({uno: false});
            }
          }
        });
        //update Turn
        this.turnSubscription = this.roomService.turnSubject.subscribe(
          (turn)=>{
            this.turn = turn;
        });
        this.turn = this.roomService.turn;
        //check

        //update current player
        this.gameRef.child("current_player").on("value",
          (current_player_snapshot)=>{
            this.currentPlayer = current_player_snapshot.val();
            //check if is player turn and if it is update action
            if(this.currentPlayer==firebase.auth().currentUser.displayName){
              this.gameRef.child("action_card").once("value",
                (action_card_snapshot)=>{
                  //check is action_card is defined
                  if(action_card_snapshot.val()){
                    const action_card: string = action_card_snapshot.val();
                    if(action_card=="skip_turn"){
                      this.gameRef.child("action_card").remove().then(
                        ()=>{
                          this.roomService.updateTurn();
                        }
                      );
                    }else if(action_card.includes("pick")){
                      const pickValue = parseInt(action_card.split("_")[1]);
                      this.cards.forEach(
                        (card)=>{ if(card.includes(this.currentCard.split("_")[this.currentCard.split("_").length - 1])){ this.isStackingCard = true;} }
                      );
                      if(!this.isStackingCard){
                        for (let index = 0; index < pickValue; index++) {
                          this.onPickCard(true);
                        }
                        this.gameRef.child("action_card").remove().then(
                          ()=>{
                            this.roomService.updateTurn();
                          }
                        );
                      }
                    }
                  }else{
                    this.hasPickCard = false;
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
    if((this.canPlay&&!this.hasPickCard) || skip){
      this.roomService.pickCard().then(
        (card: string)=>{
          this.cards.push(card);
          this.uno = false;
          this.roomService.playerRef.update({uno: false});
          this.sortedCards = this.sortCards();
          this.roomService.playerRef.update({cards: this.cards.length});
          if(!skip){
            this.hasPickCard = true;
            if(!this.canPlayCard(card)){
              this.canPlay = false;
              this.roomService.updateTurn();
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
        this.sortedCards = this.sortCards();
        this.roomService.playerRef.update({cards: this.cards.length});
        if(this.cards.length==0){
          this.gameRef.child("current_card").remove();
        }else{
          this.roomService.updateTurn();
        }
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
        if(this.forcedColor && !card.includes("wild")){
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
          this.sortedCards = this.sortCards();
          this.roomService.updateTurn();
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

  InitParty(){
    this.roomService.InitGame().then(
      ()=>{}
    );
  }

  sortCards(){
    const sortCards = this.cards;
    sortCards.sort();
    return sortCards;
  }

  sayUno(){
    if(this.cards.length == 1){
      this.uno = true;
      this.roomService.playerRef.update({uno: true});
      this.roomService.newChat("uno !");
    }
  }
  blockUno(){
    return new Promise(
      (resolve, reject)=>{
        this.gameRef.child("players").once("value",
        (playersSnapshot)=>{
          const players = playersSnapshot.val();
          if(players){
            let playersArray = Object.entries(players);
            playersArray.forEach((playerArray: [string, {name: string, cards: number, score: number, uno: boolean}])=>{
              if(!playerArray[1].uno && playerArray[1].cards==1){
                this.gameRef.child("players/"+playerArray[0]).update({uno: true});
              }
            });
          }
        });
    });
  }

  ngOnDestroy(){
    if(this.playersSubscription){
      this.playersSubscription.unsubscribe();
      this.playersUpdateSubscription.unsubscribe();
      this.gameRef.child("current_card").off();
    }
    this.roomService.disconnect();
  }
}
