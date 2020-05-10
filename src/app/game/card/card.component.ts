import { Component, OnInit, Input, Output } from '@angular/core';
import { RoomService } from 'src/app/services/room.service';
import { EventEmitter } from 'protractor';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {

  @Input() cardName: string;
  @Input() cardTheme: number;
  @Input() cursor: boolean=true;
  @Input() fixed: boolean = false;

  constructor(private roomService: RoomService) { }

  ngOnInit(): void {
  }
}
