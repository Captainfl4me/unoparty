export class Game {
  players: Array<string> = [];
  nextPlayer: string;
  turn: number = 1;

  ToJSON(){
    return {
      players: this.players,
      nextPlayer: this.nextPlayer,
      turn: this.turn
    }
  }
}
