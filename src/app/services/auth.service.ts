import { Injectable, OnInit } from '@angular/core';
import * as firebase from'firebase/app';
import 'firebase/auth';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService{

  isAuth = false;
  isLoaded = false;
  isLoadedSubject: Subject<boolean> = new Subject<boolean>();

  constructor() {
    firebase.auth().onAuthStateChanged(
      (user)=>{
        if(user){
          this.isAuth = true;
        }else{
          this.isAuth = false;
        }
        if(!this.isLoaded){
          this.isLoaded = true;
          this.isLoadedSubject.next(this.isLoaded);
        }
      }
    );
  }

  SignUpWithEmail(pseudo: string, email: string, password: string){
    return new Promise(
      (resolve, reject)=>{
        firebase.auth().createUserWithEmailAndPassword(email, password).then(
          ()=>{
            firebase.auth().currentUser.updateProfile({
              displayName: pseudo
            }).then(
              ()=>{
                resolve(true);
              },
              (error)=>{
                reject(error.message);
              }
            );
          },
          (error)=>{
            switch(error.code){
              case "auth/email-already-in-use":
                reject("Email déjà utilisé !");
              case "auth/weak-password":
                reject("Le mot de passe doit faire au moins 6 caractères.");
              default:
                reject(error.message);
            }
            reject(error);
          }
        );
      }
    );
  }

  SignInWithEmail(email: string, password: string){
    return new Promise(
      (resolve, reject)=>{
        firebase.auth().signInWithEmailAndPassword(email, password).then(
          (result)=>{
            console.log(result);
            this.isAuth = true;
            resolve(this.isAuth);
          },
          (error)=>{
            switch(error.code){
              case "auth/user-not-found":
                reject("Utilisateur introuvable");
              case "auth/wrong-password":
                reject("Mot de passe incorrect");
              default:
                reject(error.message);
            }
          });
        }
    );
  }

  SignInWithGoogle(){
    return new Promise(
      (resolve, reject)=>{
        firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(
          ()=>{
            this.isAuth = true;
            resolve(this.isAuth);
          },
          (error)=>{
            reject(error.message);
          }
        );
      }
    );
  }

  SignOut(){
    firebase.auth().signOut();
  }
}
