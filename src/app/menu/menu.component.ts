import { Component, OnInit } from '@angular/core';
import { RoomService } from '../services/room.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import * as firebase from 'firebase/app';
import 'firebase/database';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  createRoom: boolean=false;
  createRoomForm: FormGroup;
  isCreatingRoom: boolean=false;

  picture: string;
  username: string;

  roomList: Array<{name: string, id: string}>=[];

  constructor(private formBuilder: FormBuilder, private router: Router, private authService: AuthService, private roomService: RoomService) { }

  ngOnInit(): void {
    this.username = this.authService.username;
    this.picture = this.authService.picture;
    this.initForm();
    firebase.database().ref("public_room").on("child_added",
    (roomSnapshot)=>{
      const room = roomSnapshot.val();
      this.roomList.push({name: room.name, id: roomSnapshot.key});
    });
    firebase.database().ref("public_room").on("child_removed",
    (roomSnapshot)=>{
      const room = roomSnapshot.val();
      this.roomList.splice(this.roomList.map(function(e) { return e.id; }).indexOf(room.id), 1);
    });
  }
  initForm(){
    this.createRoomForm = this.formBuilder.group({
      name: ['', Validators.required],
      players: [5, [Validators.required, Validators.min(2), Validators.max(10)]],
      isPrivate: [false]
    });
  }
  connect(id: string){
    this.router.navigate(['game', 'public', id]);
  }
  onCreateRoom(){
    if(this.createRoom){
      const value = this.createRoomForm.value;
      this.isCreatingRoom=true;
      this.roomService.createNewRoom(value.isPrivate, value.name, value.players).then(
        (roomId)=>{
          this.createRoom = false;
          this.isCreatingRoom=false;
          if(value.isPrivate){
            this.router.navigate(['game', 'private' , roomId]);
          }else{
            this.router.navigate(['game', 'public', roomId]);
          }
        },
        (error)=>{
          console.log(error);
        }
      );
    }
  }

  onDeconnect(){
    this.authService.SignOut().then(
      ()=>{
        this.router.navigate(['/']);
      }
    );
  }
}
