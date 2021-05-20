import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import firebase from 'firebase/app';
import 'firebase/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  changeDisplayName: FormGroup;

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.changeDisplayName = this.formBuilder.group({
      displayName: [firebase.auth().currentUser.displayName, Validators.required]
    });
  }

  onChangeDisplayName(){
    const value = this.changeDisplayName.value;
    firebase.auth().currentUser.updateProfile({ displayName: value.displayName });
  }

}
