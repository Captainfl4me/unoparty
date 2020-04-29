import { Component, OnInit, Input, Output } from '@angular/core';
import { RoomService } from 'src/app/services/room.service';
import { EventEmitter } from 'protractor';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent implements OnInit {

  @Input() cardName: string;
  @Input() cardIndex: number;

  constructor(private roomService: RoomService) { }

  ngOnInit(): void {
  }
}
