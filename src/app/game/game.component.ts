import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../services/room.service';
import { Subscription } from 'rxjs';
import * as firebase from 'firebase/app';
import 'firebase/auth';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {

  roomId: string;
  roomName: string;

  cards: Array<string>=[];
  currentCard: string = "";
  currentCardSubscription: Subscription;

  currentPlayer: string;
  currentplayerSubscription: Subscription;
  currentUser: firebase.User;

  isSelectingColor: boolean = false;
  selectedColor: string = "";
  colorCard: {name: string, index: number};

  constructor(private activatedRoute: ActivatedRoute, private roomService: RoomService, private router: Router) { }

  ngOnInit(): void {
    this.roomId = this.activatedRoute.snapshot.params['id'];
    this.roomService.connect(this.roomId).then(
      (roomName)=>{
        this.roomName = roomName;
        for(let index = 0; index < 7; index++){
          this.onPickCard();
        }
        this.currentCardSubscription = this.roomService.currentCardSubject.subscribe(
          (currentCard)=>{
            this.currentCard = currentCard;
          }
        );
        this.currentplayerSubscription = this.roomService.currentCardSubject.subscribe(
          (currentPlayer)=>{
            this.currentPlayer = currentPlayer;
          }
        );
        this.currentPlayer = this.roomService.currentPlayer;
        this.currentCard = this.roomService.currentCard;
        this.currentUser = firebase.auth().currentUser;
      },
      ()=>{
        this.router.navigate(['/menu']);
      }
    );
    window.onbeforeunload = () => this.ngOnDestroy();
  }

  onPickCard(){
    this.roomService.pickCard().then(
      (card: string)=>{
        this.cards.push(card);
      }
    );
  }
  onPutCard(index: number, name: string){
    if(this.currentPlayer==this.currentUser.displayName){
      if(name.includes("wild")){
        this.isSelectingColor=true;
        this.colorCard={name: name, index: index};
      }else{
        const names = name.split("_");
        const color = names[0];
        const value = names[1];
        if(this.currentCard.includes(color) || this.currentCard.includes(value)){
          this.isSelectingColor=false;
          this.actionCard(name).then(
            ()=>{
              this.roomService.putCard(name);
              this.cards.splice(index, 1);
            }
          );
        }
      }
    }
  }
  //select a color
  selectColor(color: string){
    if(this.isSelectingColor){
      this.selectedColor=color;
      this.roomService.putCard(this.colorCard.name);
      this.cards.splice(this.colorCard.index, 1);
      this.isSelectingColor=false;
    }
  }
  //apply acion for special card
  actionCard(name: string){
    return new Promise(
      (resolve)=>{
        if(name.includes("reverse")){
          this.roomService.reverseCard().then(()=>{ resolve(); });
        }else{
          resolve();
        }
      }
    );
  }


  ngOnDestroy(){
    if(this.currentCardSubscription){
      this.currentCardSubscription.unsubscribe();
      this.currentplayerSubscription.unsubscribe();
      this.roomService.disconnect();
    }
  }
}
