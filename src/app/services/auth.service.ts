import { Injectable, OnInit } from '@angular/core';
import * as firebase from'firebase/app';
import 'firebase/auth';
import { Subject } from 'rxjs';
import { promise } from 'protractor';

@Injectable({
  providedIn: 'root'
})
export class AuthService{

  isAuth = false;
  isLoaded = false;
  isLoadedSubject: Subject<boolean> = new Subject<boolean>();

  username: string;
  picture: string;

  userPreferences: {cards: string, theme: string};

  constructor() {
    firebase.auth().onAuthStateChanged(
      (user)=>{
        if(user){
          this.isAuth = true;
          this.username = firebase.auth().currentUser.displayName;
          this.picture = firebase.auth().currentUser.photoURL;
          this.getUserPreferences();
        }else{
          this.isAuth = false;
          this.username = null;
          this.picture = null;
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
          (userCredential)=>{
            firebase.auth().currentUser.updateProfile({displayName: pseudo}).then(
              ()=>{
                firebase.database().ref("users/"+userCredential.user.uid).set({cards: 'flat', theme: 'flat-dark'}).then(
                  (value)=>{
                    this.isAuth=true;
                    this.userPreferences=value;
                    resolve(this.isAuth);
                  }
                );
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
          (userCredential)=>{
            firebase.database().ref("users/"+userCredential.user.uid).once("value",
            (valueSnapshot)=>{
              this.isAuth = true;
              this.userPreferences=valueSnapshot.val();
              resolve(this.isAuth);
            },
            (error)=>{reject(error);});
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

  SignUpWithGoogle(){
    return new Promise(
      (resolve, reject)=>{
        firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(
          (userCredential)=>{
            firebase.database().ref("users/"+userCredential.user.uid).set({cards: 'flat', theme: 'flat-dark'}).then(
              (value)=>{
                this.isAuth = true;
                this.userPreferences=value;
                resolve(this.isAuth);
              }
            );
            resolve(this.isAuth);
          },
          (error)=>{
            reject(error.message);
          }
        )
      }
    )
  }

  SignInWithGoogle(){
    return new Promise(
      (resolve, reject)=>{
        firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(
          (userCredential)=>{
            firebase.database().ref("users/"+userCredential.user.uid).once("value",
            (valueSnapshot)=>{
              this.userPreferences=valueSnapshot.val();
              this.isAuth = true;
              resolve(this.isAuth);
            },
            (error)=>{reject(error);});
          },
          (error)=>{
            reject(error.message);
          }
        );
      }
    );
  }

  SignOut(){
    return new Promise(
      (resolve)=>{
        firebase.auth().signOut().then(
          ()=>{resolve(true);}
        );
      }
    )
  }

  createCookie(name,value,days) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toUTCString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
  }
  getUserPreferences(){
    return new Promise(
      (resolve, reject)=>{
        firebase.database().ref("users/"+firebase.auth().currentUser.uid).once("value",
          (valueSnapshot)=>{
            this.userPreferences = valueSnapshot.val();
            if(this.userPreferences){
              this.createCookie("theme", this.userPreferences.theme, 50000);
              document.getElementsByTagName("html")[0].setAttribute("data-theme", this.userPreferences.theme);
              resolve();
            }else{
              firebase.database().ref("users/"+firebase.auth().currentUser.uid).set({cards: 'flat', theme: 'flat-dark'}).then(
                (value)=>{
                  this.userPreferences=value;
                  this.createCookie("theme", this.userPreferences.theme, 50000);
                  document.getElementsByTagName("html")[0].setAttribute("data-theme", this.userPreferences.theme);
                  resolve();
                },(error)=>{ reject(error); }
              );
            }
        },(error)=>{ reject(error); });
      }
    )
  }

}
