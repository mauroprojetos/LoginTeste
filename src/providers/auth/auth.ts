import { Injectable } from '@angular/core';
import { AngularFireDatabase} from 'angularfire2/database';
import { AngularFireAuth } from 'angularfire2/auth';
import * as firebase from 'firebase';
import { Platform } from 'ionic-angular';
import { Facebook } from '@ionic-native/facebook';
import { TwitterConnect } from '@ionic-native/twitter-connect';


@Injectable()
export class AuthProvider {

  authState: any = null;

  constructor(
    private afAuth: AngularFireAuth,
    private db: AngularFireDatabase,
    private platform: Platform,
    private fb: Facebook,
    private tw: TwitterConnect
  ) {
    this.afAuth.authState.subscribe((auth) => {
      this.authState = auth
    });
  }

  // Returns true if user is logged in
  get authenticated(): boolean {
    return this.authState !== null;
  }

  // Returns current user data
  get currentUser(): any {
    return this.authenticated ? this.authState : null;
  }

  // Returns
  get currentUserObservable(): any {
    return this.afAuth.authState
  }

  // Returns current user UID
  get currentUserId(): string {
    return this.authenticated ? this.authState.uid : '';
  }

  // Anonymous User
  get currentUserAnonymous(): boolean {
    return this.authenticated ? this.authState.isAnonymous : false
  }

  // Returns current user display name or Guest
  get currentUserDisplayName(): string {
    if (!this.authState) { return 'Guest' }
    else if (this.currentUserAnonymous) { return 'Anonymous' }
    else { return this.authState['displayName'] || 'User without a Name' }
  }

  //// Social Auth ////
  githubLogin() {
    const provider = new firebase.auth.GithubAuthProvider()
    return this.socialSignIn(provider);
  }

  googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider()
    return this.socialSignIn(provider);
  }

  facebookLogin(): Promise<void>{
    if (this.platform.is('cordova')) {
      //Native facebook login
      //Facebook permissions: https://developers.facebook.com/docs/facebook-login/permissions
      //These two doesn't need any permission granted from facebook.
      let permissions = ['email', 'public_profile'];
      return this.fb.login(permissions).then(res => {
        const facebookCredential = firebase.auth.FacebookAuthProvider.credential(res.authResponse.accessToken);
        return this.afAuth.auth.signInWithCredential(facebookCredential).then(success => {
          // Saving response to authState to perform validations
          this.authState = success;
          //(Optional) Creating or updating user on firebase
          this.db.list('users').update(success.providerData[0].uid, success.providerData[0]);
        }).catch(error => console.log(error));
      }).catch(error => console.log(error));
    }
    else {
      return this.afAuth.auth.signInWithPopup(new firebase.auth.FacebookAuthProvider())
        .then(success => {
          //Saving response to authState to perform validations
          this.authState = success;
          //(Optional) Creating or updating user on firebase
          this.db.list('users').update(this.authState.user.providerData[0].uid, this.authState.user.providerData[0]);
        }).catch(error => console.log(error));
    }
  }

  twitterLogin(): Promise<void>{
    if(this.platform.is('cordova'))
    {
      return this.tw.login().then(response => {
        const twitterCredential = firebase.auth.TwitterAuthProvider.credential(response.token, response.secret);
    
      return this.afAuth.auth.signInWithCredential(twitterCredential).then(success => {
          //Saving response to authState to perform validations
          this.authState = success;
          //(Optional) Creating or updating user on firebase
          this.db.list('users').update(this.authState.user.providerData[0].uid, this.authState.user.providerData[0]);
        }, error => console.log("Error connecting to twitter: ", error));
      }, error => console.log("Error connecting to twitter: ", error));
    }
    else {
      return this.afAuth.auth.signInWithPopup(new firebase.auth.TwitterAuthProvider()).then(success => {
        //Saving response to authState to perform validations
        this.authState = success;
        //(Optional) Creating or updating user on firebase
        this.db.list('users').update(this.authState.user.providerData[0].uid, this.authState.user.providerData[0]);
      }, error => console.log("Error connecting to twitter: ", error));
    }
  }

  private socialSignIn(provider) {
    return this.afAuth.auth.signInWithPopup(provider)
      .then((credential) =>  {
          this.authState = credential.user
          this.updateUserData()
      })
      .catch(error => console.log(error));
  }


  //// Anonymous Auth ////
  anonymousLogin() {
    return this.afAuth.auth.signInAnonymously()
    .then((user) => {
      this.authState = user
      this.updateUserData()
    })
    .catch(error => console.log(error));
  }

  //// Email/Password Auth ////
  emailSignUp(email:string, password:string) {
    return this.afAuth.auth.createUserWithEmailAndPassword(email, password)
      .then((user) => {
        this.authState = user
        this.updateUserData()
      })
      .catch(error => console.log(error));
  }

  emailLogin(email:string, password:string) {
     return this.afAuth.auth.signInWithEmailAndPassword(email, password)
       .then((user) => {
         this.authState = user
         this.updateUserData()
       })
       .catch(error => console.log(error));
  }

  // Sends email allowing user to reset password
  resetPassword(email: string) {
    var auth = firebase.auth();

    return auth.sendPasswordResetEmail(email)
      .then(() => console.log("email sent"))
      .catch((error) => console.log(error))
  }


  //// Sign Out ////
  signOut(): Promise<void> {
    return this.afAuth.auth.signOut();
  }


  //// Helpers ////
  private updateUserData(): void {
  // Writes user name and email to realtime db
  // useful if your app displays information about users or for admin features
    let path = `users/${this.currentUserId}`; // Endpoint on firebase
    let data = {
                  email: this.authState.email,
                  name: this.authState.displayName
                }

    this.db.object(path).update(data)
    .catch(error => console.log(error));

  }




}