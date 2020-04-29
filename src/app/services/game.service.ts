import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor() { }

  createNewDeck(): Array<string>{
    let cards: Array<string> = [];
    //for colored cards
    const colors = ["blue", "green", "red", "yellow"];
    const specificValue = ["picker", "reverse", "skip"];

    for(const color of colors){

      for(let loop = 0; loop < 2; loop++){
        for (let index = loop; index <= 12; index++) {
          let card: string;
          if(index<=9){
            //number
            card = color+"_"+index.toString();
          }else{
            //specific
            card = color+"_"+specificValue[index-10];
          }
          //push in final array
          cards.push(card);
        }
      }
    }
    //for wild cards
    const wilds = ["color_changer", "pick_four"];
    for(const value of wilds){
      for (let index = 0; index < 4; index++) {
        const card = "wild"+"_"+value;
        cards.push(card);
      }
    }
    return cards;
  }

  pickCard(roomRef: firebase.database.Reference){
    return new Promise(
      (resolve, reject)=>{
        roomRef.child("cards").once("value",
        (dataSnapshot)=>{
          const cards = Object.entries(dataSnapshot.val());
          const x = Math.floor(Math.random()*107);
          if(cards[x]){
          roomRef.child("cards").child(cards[x][0]).remove();
          resolve(cards[x][1]);
          }else{
            reject(false);
          }
        });
      }
    );
  }
}
