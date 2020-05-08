import { Component } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/auth';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(){
    //firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyD1kA3WjaT2lQeiKwIUDE7GvRjCBK4dOXU",
      authDomain: "uno-party.firebaseapp.com",
      databaseURL: "https://uno-party.firebaseio.com",
      projectId: "uno-party",
      storageBucket: "uno-party.appspot.com",
      messagingSenderId: "848903132154",
      appId: "1:848903132154:web:da1e65b43766c1dba4ca43",
      measurementId: "G-7Z54MWNLJX"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    firebase.analytics();
  }
}
