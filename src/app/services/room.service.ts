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

  players: Array<{name: string, cards: number}>=[];
  playersSubject = new Subject<Array<{name: string, cards: number}>>();
  playerRef: firebase.database.Reference;

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
                  this.roomRef.child("game/cards").push(card);
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
    return new Promise<firebase.database.Reference>(
      (resolve, reject)=>{
        //firebase ref to database
        this.roomRef = firebase.database().ref("private_room").child(roomId);
        this.chats = [];
        this.chatSubject.next(this.chats);

        this.roomRef.child("creator").once("value",
        (creator_snapshot)=>{
          //check if room is initialized
          if(creator_snapshot.val()){
            //update chats
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
                  const player = { name: dataSnapshot.val().name, cards: parseInt(dataSnapshot.val().cards) };
                  if(player.name!=firebase.auth().currentUser.displayName){
                    this.players.push(player);
                    this.playersSubject.next(this.players);
                    this.chats.push({name: "", content: player.name+" vient de rejoindre la partie !"});
                    this.chatSubject.next(this.chats);
                  }
                });
                this.roomRef.child("game/players").on("child_removed",
                (dataSnapshot)=>{
                  const player = { name: dataSnapshot.val().name, cards: parseInt(dataSnapshot.val().cards) };
                  if(player.name!=firebase.auth().currentUser.displayName){
                    this.players.splice(this.players.indexOf(player), 1);
                    this.playersSubject.next(this.players);
                    this.chats.push({name: "", content: player.name+" vient de quitter la partie."});
                    this.chatSubject.next(this.chats);
                  }
                });

                //check if turn not assigned
                this.roomRef.child("game/current_player").once("value",
                  (dataSnapshot)=>{
                    if(!dataSnapshot.val()){
                      console.log("set turn");
                      this.roomRef.child("game/current_player").set(firebase.auth().currentUser.displayName);
                    }
                });
                resolve(this.roomRef.child("game"));
              }
            );
          }else{
            reject(false);
          }
        });
      }
    );
  }
  //submit Chat change event / update chat in component
  refreshChat(){
    this.chatSubject.next(this.chats);
  }
  //submit a new chat to room
  newChat(content: string){
    const chat = {
      name: firebase.auth().currentUser.displayName,
      content: content
    };
    this.roomRef.child("chats").push(chat);
  }
  //pick a card from the deck
  pickCard(){
    return new Promise<string>(
      (resolve, reject)=>{
        this.gameService.pickCard(this.roomRef).then(
        (card: string)=>{
          resolve(card);
        },
        (error)=>{
          reject(error);
        });
      }
    );
  }
  //pick a card to start the game
  pickStartCard(){
   return new Promise(
     (resolve, reject)=>{
      this.gameService.pickCard(this.roomRef).then(
        (card: string)=>{
          if(card.includes("wild")||card.includes("picker")||card.includes("skip")||card.includes("reverse")){
            this.pickStartCard().then(
              (NewCard: string)=>{
                this.roomRef.child("game/cards").push(card);
                resolve(NewCard);
              }
            );
          }else{
            resolve(card);
          }
        },
        (error)=>{
          reject(error);
        });
      }
   );
  }

  //updateTurn
  updateTurn(cards: number){
    const currentIndex = this.players.indexOf({name: firebase.auth().currentUser.displayName, cards: cards});
    this.roomRef.child("game/turn").once("value",
    (dataSnapshot)=>{
      const newPlayerIndex = (currentIndex+dataSnapshot.val())%this.players.length;
      this.roomRef.child("game/current_player").set(this.players[newPlayerIndex].name);
    },
    ()=>{
      this.updateTurn(cards);
    });
  }
  //disconnect from room
  disconnect(){
    if(this.isAdmin){
      this.roomRef.remove();
    }else{
      try{
        this.playerRef.remove();
      }catch{
        return false;
      }
    }
    this.chats = [];
    this.roomRef.off();
    this.isAdmin = false;
  }

  ngOnDestroy(){
    this.disconnect();
  }
}
