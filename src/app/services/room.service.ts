import { Injectable, OnDestroy } from '@angular/core';
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/auth';
import { Subject } from 'rxjs';
import { GameService } from './game.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RoomService implements OnDestroy{

  roomRef: firebase.database.Reference;
  isConnect = false;

  chats: any = [];
  chatSubject = new Subject<Array<string>>();

  players: Array<{name: string, cards: number, score: number, uno: boolean}> = [];
  playersSubject = new Subject<Array<{name: string, cards: number, score: number, uno: boolean}>>();
  playerUpdateSubject = new Subject<{name: string, cards: number, score: number, uno: boolean}>();
  playerRef: firebase.database.Reference;

  turn: number;
  turnSubject = new Subject<number>();

  isAdmin = false;

  constructor(private gameService: GameService, private router: Router) {
  }

  createNewRoom(isPrivate: boolean, name: string, maxPlayers: number, rules: {rule0: boolean, rule7: boolean, ruleSheep: boolean}){
    return new Promise(
      (resolve, reject) => {
        const newRoom = {creator: firebase.auth().currentUser.displayName, name, maxPlayers, rules};
        // push room in database
        firebase.database().ref(isPrivate ? 'private_room' : 'public_room').push(newRoom).then(
          (ref) => {
            this.roomRef = ref;
            resolve(ref.key);
          }, (error) => { reject(error); });
      }
    );
  }

  InitGame(){
    return new Promise(
      (resolve, reject) => {
        if (this.isAdmin){
          this.roomRef.child('game/current_player').remove();
          this.roomRef.child('game/cards').remove();
          // initialize game
          const cards = this.gameService.createNewDeck();
          for (const card of cards){
            this.roomRef.child('game/cards').push(card);
          }
          this.pickStartCard().then(
            (card: string) => {
              this.roomRef.child('game/current_card').set(card);
              resolve(true);
          });
          // check if turn not assigned
          this.roomRef.child('game/current_player').once('value',
            (dataSnapshot) => {
              if (!dataSnapshot.val()){
                this.roomRef.child('game/current_player').set(this.players[0].name);
              }
          });
          this.roomRef.child('game/turn').set(1);
        }else{
          reject();
        }
      });
  }

  connect(roomId: string, conf: string){
    this.isAdmin = false;
    return new Promise<firebase.database.Reference>(
      (resolve, reject) => {
        // firebase ref to database
        this.roomRef = firebase.database().ref(conf === 'private' ? 'private_room' : 'public_room').child(roomId);
        // reset chats
        this.chats = [];
        this.chatSubject.next(this.chats);
        this.players = [];
        this.playersSubject.next(this.players);

        this.roomRef.child('creator').once('value',
        (creatorSnapshot) => {
          const creator = creatorSnapshot.val();
          this.roomRef.child('creator').on('value',
            (creatorName) => {
              if (!creatorName.val()){
                this.disconnect();
              }
          });
          // check if room exist
          if (creator){
            this.isConnect = true;
            if (creator === firebase.auth().currentUser.displayName){
              this.isAdmin = true;
            }
            // firebase push new user connection
            this.roomRef.child('game/players').push({name: firebase.auth().currentUser.displayName, cards: 0, score: 0, uno: false}).then(
              (ref) => {
                this.playerRef = ref;

                this.roomRef.child('maxPlayers').once('value',
                  (maxPlayersSnapshot) => {
                    this.roomRef.child('game/players').once('value',
                      (players) => {
                        if (Object.values(players.val()).length > maxPlayersSnapshot.val()){
                          this.disconnect();
                        }
                    });
                });
                // chats listener and update
                this.roomRef.child('chats').on('child_added',
                  (datasnapshot) => {
                    this.chats.push(datasnapshot.val());
                    this.chatSubject.next(this.chats);
                });

                // update turn
                this.roomRef.child('game/turn').on('value',
                (turnSnapshot) => {
                  const turn = turnSnapshot.val();
                  if (turn){
                    this.turn = turn;
                    this.turnSubject.next(this.turn);
                  }
                });
                // left and join message listener
                this.roomRef.child('game/players').on('child_added',
                (dataSnapshot) => {
                  const player: {name: string, cards: number, score: number, uno: boolean} = dataSnapshot.val();
                  if (player.name !== firebase.auth().currentUser.displayName){
                    this.chats.push({name: '', content: player.name + ' vient de rejoindre la partie !'});
                    this.chatSubject.next(this.chats);
                  }
                  this.players.push(player);
                  this.playersSubject.next(this.players);
                });
                this.roomRef.child('game/players').on('child_removed',
                (dataSnapshot) => {
                  const player: {name: string, cards: number, score: number, uno: boolean} = dataSnapshot.val();
                  if (player.name !== firebase.auth().currentUser.displayName){
                    this.chats.push({name: '', content: player.name + ' vient de quitter la partie.'});
                    this.chatSubject.next(this.chats);
                  }
                  this.players.splice(this.players.map(function(e) { return e.name; }).indexOf(player.name), 1);
                  this.playersSubject.next(this.players);
                });
                this.roomRef.child('game/players').on('child_changed',
                (dataSnapshot) => {
                  const player: {name: string, cards: number, score: number, uno: boolean} = dataSnapshot.val();
                  const index = this.players.map(function(e) { return e.name; }).indexOf(player.name);
                  this.players[index].cards = player.cards;
                  this.players[index].uno = player.uno;
                  this.playerUpdateSubject.next(player);
                });
                resolve(this.roomRef.child('game'));
              }
            );
          }else{
            reject('room doesn\'t exist');
          }
        });
      }
    );
  }

  // submit Chat change event / update chat in component
  refreshChat(){
    this.chatSubject.next(this.chats);
  }
  // submit a new chat to room
  newChat(content: string){
    const chat = {
      name: firebase.auth().currentUser.displayName,
      content
    };
    this.roomRef.child('chats').push(chat);
  }
  // pick a card from the deck
  pickCard(){
    return new Promise<string>(
      (resolve, reject) => {
        this.gameService.pickCard(this.roomRef).then(
        (card: string) => {
          resolve(card);
        },
        (error) => {
          reject(error);
        });
      }
    );
  }
  // pick a card to start the game
  pickStartCard(){
   return new Promise(
     (resolve, reject) => {
      this.gameService.pickCard(this.roomRef).then(
        (card: string) => {
          if (card.includes('wild') || card.includes('picker') || card.includes('skip') || card.includes('reverse')){
            this.pickStartCard().then(
              (NewCard: string) => {
                this.roomRef.child('game/cards').push(card);
                resolve(NewCard);
              }
            );
          }else{
            resolve(card);
          }
        },
        (error) => {
          reject(error);
        });
      }
   );
  }

  // updateTurn
  updateTurn(){
    const currentIndex = this.players.map(function(e) { return e.name; }).indexOf(firebase.auth().currentUser.displayName);
    let newPlayerIndex: number = (currentIndex + this.turn) % this.players.length;
    if (newPlayerIndex < 0){
      newPlayerIndex = this.players.length - 1;
    }
    this.roomRef.child('game/current_player').set(this.players[newPlayerIndex].name);
  }
  // disconnect from room
  disconnect(){
    this.isConnect = false;
    if (this.isAdmin){
      this.roomRef.remove();
    }else{
      try{
        this.playerRef.remove();
      }catch {
        return false;
      }
    }
    this.chats = [];
    this.roomRef.child('creator').off();
    this.roomRef.child('chats').off();
    this.roomRef.child('game/players').off();
    this.roomRef.off();
    this.isAdmin = false;
    this.router.navigate(['menu']);
  }

  ngOnDestroy(){
    this.disconnect();
  }
}
