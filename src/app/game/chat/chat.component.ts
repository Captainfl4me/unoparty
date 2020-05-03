import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { RoomService } from 'src/app/services/room.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {

  chats;
  chatsSubscribe: Subscription;

  submitChat: FormGroup;

  constructor(private roomService: RoomService, private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.chatsSubscribe = this.roomService.chatSubject.subscribe(
      (chats) =>{
        this.chats = chats;
      }
    );
    this.roomService.refreshChat();
    this.initForm();
  }
  initForm(){
    this.submitChat = this.formBuilder.group({
      content: ['', Validators.required]
    })
  }

  onSubmitChat(){
    const value = this.submitChat.value;
    this.roomService.newChat(value.content);
    this.submitChat.reset();
  }

  ngOnDestroy(): void{
    this.chatsSubscribe.unsubscribe();
  }
}
