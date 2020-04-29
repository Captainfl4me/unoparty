import { Injectable, OnDestroy } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/auth';
import { Room } from '../models/room/room.model';
import { Subject } from 'rxjs';
import { GameService } from './game.service';

@Injectable({
  providedIn: 'root'
})
export class RoomService implements OnDestroy{

  room: Room;
  roomRef: firebase.database.Reference;

  chats: any = [];
  chatSubject = new Subject<Array<string>>();

  players: Array<string>=[];
  playersSubject = new Subject<Array<string>>();
  playerRef: firebase.database.Reference;

  currentCard: string;
  currentCardSubject = new Subject<string>();

  currentPlayer: string;
  currentPlayerSubject = new Subject<string>();
  currentUser: firebase.User;

  isAdmin: boolean = false;

  constructor(private gameService: GameService) {
    const username = firebase.auth().currentUser.displayName;
    this.room = new Room(username, username);
  }

  createNewRoom(isPrivate: boolean, name: string){
    return new Promise(
      (resolve, reject)=>{
        this.room = new Room(firebase.auth().currentUser.displayName, name);
        if(isPrivate){
          //push room in database
          firebase.database().ref("private_room").push(this.room).then(
            (ref)=>{
              this.roomRef = ref;
              ref.once('value', (data)=>{
                //initialize game
                const cards = this.gameService.createNewDeck();
                for(const card of cards){
                  this.roomRef.child("cards").push(card);
                }
                this.pickStartCard().then(
                  (card: string)=>{
                    this.roomRef.child("game/current_card").set(card);
                    this.isAdmin = true;
                    resolve(data.key);
                  }
                );
              });
            },
            (error)=>{
              reject(error);
            }
          );
        }
      }
    );
  }

  connect(roomId: string){
    return new Promise<string>(
      (resolve, reject)=>{
        //firebase ref to database
        this.roomRef = firebase.database().ref("private_room").child(roomId);
        this.roomRef.child("creator").once("value",
        (dataSnapshot)=>{
          if(dataSnapshot.val()){
            this.roomRef.child("chats").on("child_added",
            (datasnapshot)=>{
              this.chats.push(datasnapshot.val());
              this.chatSubject.next(this.chats);
                });
            //firebase push new user connection
            this.roomRef.child("game/players").push({name: firebase.auth().currentUser.displayName, cards: 0}).then(
              (ref)=>{
                this.playerRef = ref;

                //left and join message listener
                this.roomRef.child("game/players").on("child_added",
                (dataSnapshot)=>{
                  const username = dataSnapshot.val().name;
                  if(username!=firebase.auth().currentUser.displayName){
                    this.players.push(username);
                    this.chats.push({name: "", content: username+" vient de rejoindre la partie !"});
                    this.chatSubject.next(this.chats);
                  }
                });
                this.roomRef.child("game/players").on("child_removed",
                (dataSnapshot)=>{
                  const username = dataSnapshot.val().name;
                  if(username!=firebase.auth().currentUser.displayName){
                    this.players.splice(this.players.indexOf(username), 1);
                    this.chats.push({name: "", content: username+" vient de quitter la partie."});
                    this.chatSubject.next(this.chats);
                  }
                });
                //update currentCard
                this.roomRef.child("game/current_card").on("value",
                (dataSnapshot)=>{
                  this.currentCard = dataSnapshot.val();
                  this.currentCardSubject.next(this.currentCard);

                  //upadte current player
                  this.roomRef.child("game/current_player").on("value",
                  (dataSnapshot)=>{
                    this.currentPlayer = dataSnapshot.val();
                    this.currentCardSubject.next(this.currentPlayer);
                  });
                  //check if turn not assigned
                  this.roomRef.child("game/current_player").once("value",
                  (dataSnapshot)=>{
                    if(!dataSnapshot.val()){
                      this.roomRef.child("game/current_player").set(firebase.auth().currentUser.displayName);
                    }
                  });
                  //get name and resolve connection
                  this.roomRef.child("name").once('value', (dataSnapshot)=>{ resolve(dataSnapshot.val()); });
                });

              }
            );
          }else{
            reject(false);
          }
        });
      }
    );
  }

  refreshChat(){
    this.chatSubject.next(this.chats);
  }

  newChat(content: string){
    const chat = {
      name: firebase.auth().currentUser.displayName,
      content: content
    };
    this.roomRef.child("chats").push(chat);
  }

  pickCard(){
    return new Promise<string>(
      (resolve, reject)=>{
        this.gameService.pickCard(this.roomRef).then(
        (card: string)=>{
          resolve(card);
        });
      }
    );
  }
  pickStartCard(){
   return new Promise(
     (resolve, reject)=>{
      this.gameService.pickCard(this.roomRef).then(
        (card: string)=>{
          if(card.includes("wild")){
            this.pickStartCard().then(
              (NewCard: string)=>{
                this.roomRef.child("game/cards").push(card);
                resolve(NewCard);
              }
            );
          }else{
            resolve(card);
          }
        });
     }
   );
  }
  putCard(card: string){
    this.roomRef.child("game/current_card").once("value",
    (dataSnapshot)=>{
      const oldCard = dataSnapshot.val();
      this.roomRef.child("game/cards").push(oldCard);
      this.roomRef.child("game/current_card").set(card);
    });
  }

  reverseCard(){
    return new Promise(
      (resolve)=>{
        this.roomRef.child("game/turn").once("value",
        (dataSnapshot)=>{
          const newTurn = dataSnapshot.val()*-1;
          this.roomRef.child("game/turn").set(newTurn);
        });
      }
    )
  }


  disconnect(){
    this.chats = [];
    if(this.isAdmin){
      this.roomRef.remove();
    }
    this.isAdmin = false;
    this.playerRef.remove();
  }

  ngOnDestroy(){
    this.disconnect();
  }
}
