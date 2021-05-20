import { Injectable } from '@angular/core';
import firebase from 'firebase/app';
import 'firebase/database';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor() { }

  createNewDeck(): Array<string>{
    const cards: Array<string> = [];
    // for colored cards
    const colors = ['blue', 'green', 'red', 'yellow'];
    const specificValue = ['picker', 'reverse', 'skip'];

    for (const color of colors){

      for (let loop = 0; loop < 2; loop++){
        for (let index = loop; index <= 12; index++) {
          let card: string;
          if (index <= 9){
            // number
            card = color + '_' + index.toString();
          }else{
            // specific
            card = color + '_' + specificValue[index - 10];
          }
          // push in final array
          cards.push(card);
        }
      }
    }
    // for wild cards
    const wilds = ['color_changer', 'pick_four'];
    for (const value of wilds){
      for (let index = 0; index < 4; index++) {
        const card = 'wild' + '_' + value;
        cards.push(card);
      }
    }
    return cards;
  }

  pickCard(roomRef: firebase.database.Reference){
    return new Promise(
      (resolve, reject) => {
        roomRef.child('game/cards').once('value',
        (dataSnapshot) => {
          const cards = Object.entries(dataSnapshot.val());
          const x = Math.floor(Math.random() * 107);
          if (cards[x]){
          roomRef.child('cards').child(cards[x][0]).remove();
          resolve(cards[x][1]);
          }else{
            reject(false);
          }
        },
        (error) => {
          reject(error);
        });
      }
    );
  }

  // card reverse action
  reverseCard(gameRef: firebase.database.Reference){
    return new Promise(
      (resolve, reject) => {
        gameRef.child('turn').once('value',
        (dataSnapshot) => {
          const newTurn = dataSnapshot.val() * -1;
          gameRef.child('turn').set(newTurn);
          resolve(true);
        },
        (error) => {
          reject(error);
        });
      }
    );
  }
  // skip action
  skipCard(gameRef: firebase.database.Reference){
    return new Promise(
      (resolve, reject) => {
        gameRef.child('action_card').set('skip_turn').then(
          () => {
            resolve(true);
          },
          (error) => {
            reject(error);
          }
        );
      }
    );
  }
  // picker action
  pick2Card(gameRef: firebase.database.Reference){
    return new Promise(
      (resolve, reject) => {
        gameRef.child('action_card').once('value',
        (dataSnapshot) => {
          let oldValue = 0;
          if (dataSnapshot.val()){
            oldValue = parseInt(dataSnapshot.val().split('_')[1], 10);
          }
          const pickCard: number = oldValue + 2;
          gameRef.child('action_card').set('pick_' + pickCard.toString()).then(
            () => {
              resolve(true);
            },
            (error) => {
              reject(error);
            }
          );
        },
        (error) => {
          reject(error);
        });
      }
    );
  }
  pick4Card(gameRef: firebase.database.Reference, color: string){
    return new Promise(
      (resolve, reject) => {
        gameRef.child('action_card').once('value',
        (dataSnapshot) => {
          let oldValue = 0;
          if (dataSnapshot.val()){
            oldValue = parseInt(dataSnapshot.val().split('_')[1], 10);
          }
          const pickCard: number = oldValue + 4;
          gameRef.child('action_card').set('pick_' + pickCard.toString()).then(
            () => {
              this.changeColor(gameRef, color).then(() => { resolve(true); });
            },
            (error) => {
              reject(error);
            }
          );
        },
        (error) => {
          reject(error);
        });
      }
    );
  }
  changeColor(gameRef: firebase.database.Reference, color: string){
    return new Promise(
      (resolve) => {
        gameRef.child('forced_color').set(color).then(() => { resolve(true); });
      }
    );
  }
}
