import { Game } from '../game/game.model';

export class Room {
  chats: Array<string> = [];
  game: Game = new Game();

  constructor(private creator: string, private name: string){
  }

  updateChatsData(chats){
    console.log(chats);
  }

  ToJSON(){
    return {
      creator: this.creator,
      game: this.game.ToJSON()
    };
  }
}
