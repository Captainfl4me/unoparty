import { Component, OnInit } from '@angular/core';
import { RoomService } from '../services/room.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  createRoom: boolean = false;
  createRoomForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private router: Router, private authService: AuthService, private roomService: RoomService) { }

  ngOnInit(): void {
    this.initForm();
  }
  initForm(){
    this.createRoomForm = this.formBuilder.group({
      name: ['', Validators.required],
      players: [5, [Validators.required, Validators.min(2), Validators.max(10)]],
      isPrivate: [false]
    });
  }

  onCreateRoom(){
    const value = this.createRoomForm.value;
    this.roomService.createNewRoom(value.isPrivate, value.name).then(
      (roomId)=>{
        this.router.navigate(['game', roomId]);
      },
      (error)=>{
        console.log(error);
      }
    )
    this.createRoom = false;
  }

  onDeconnect(){
    this.authService.SignOut();
  }
}
