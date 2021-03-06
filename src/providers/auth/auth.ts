import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';

//Ionic Native
import { Facebook } from '@ionic-native/facebook';
import { GooglePlus } from '@ionic-native/google-plus';
import { TwitterConnect } from '@ionic-native/twitter-connect';

//Firebase
import { AngularFireDatabase } from 'angularfire2/database';
import { AngularFireAuth } from 'angularfire2/auth';
import * as firebase from 'firebase';

//Providers
import { MiscProvider } from '../misc/misc';

//Models
import { User } from '../../models/user';


@Injectable()
export class AuthProvider {

  authState: any = null;

  constructor(
    private afAuth: AngularFireAuth,
    private db: AngularFireDatabase,
    private platform: Platform,
    private fb: Facebook,
    private tw: TwitterConnect,
    private gplus: GooglePlus,
    private miscProvider: MiscProvider
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

  googleLogin(): Promise<void> {
    //Requires ionic plugin
    //Google+ - https://ionicframework.com/docs/native/google-plus/
    if (this.platform.is('cordova')) {
      return this.gplus.login({
        'scopes': '', // optional, space-separated list of scopes, If not included or empty, defaults to `profile` and `email`.
        /*
          IMPORTANT TO PROPERLY LOGIN WITH GOOGLE+ YOU SHOULD USE YOUR WEBCLIENTID THAT YOU CAN GET FROM FIREBASE.
          IF YOU DON`T CHANGE YOU WILL GET AN ERROR 10
        */
        'webClientId': '661419602371-i320jkptuosn161qsnpe74rbror9kkqa.apps.googleusercontent.com',
        'offline': true
      }).then(success => {
        const googleCredential = firebase.auth.GoogleAuthProvider.credential(success.idToken);
        return this.nativeSignIn(googleCredential);
      });
    }
    else {
      const provider = new firebase.auth.GoogleAuthProvider()
      return this.socialSignIn(provider);
    }
  }

  facebookLogin(): Promise<void> {
    //Requires ionic plugin
    //Facebook - https://ionicframework.com/docs/native/facebook/
    if (this.platform.is('cordova')) {
      //Native facebook login
      //Facebook permissions: https://developers.facebook.com/docs/facebook-login/permissions
      //These two doesn't need any permission granted from facebook.
      let permissions = ['email', 'public_profile'];
      return this.fb.login(permissions).then(res => {
        const facebookCredential = firebase.auth.FacebookAuthProvider.credential(res.authResponse.accessToken);
        return this.nativeSignIn(facebookCredential);
      });
    }
    else {
      const provider = new firebase.auth.FacebookAuthProvider()
      return this.socialSignIn(provider);
    }
  }

  twitterLogin(): Promise<void> {
    //Requires ionic plugin
    //Twitter - https://ionicframework.com/docs/native/twitter-connect/
    if (this.platform.is('cordova')) {
      return this.tw.login().then(response => {
        const twitterCredential = firebase.auth.TwitterAuthProvider.credential(response.token, response.secret);
        return this.nativeSignIn(twitterCredential);
      });
    }
    else {
      const provider = new firebase.auth.TwitterAuthProvider();
      return this.socialSignIn(provider);
    }
  }

  //Used for facebook, twitter and google
  private nativeSignIn(credential) {
    return this.afAuth.auth.signInWithCredential(credential).then(success => {
      //Saving response to authState to perform validations
      this.authState = success;
      //(Optional) Creating or updating user on firebase
      this.updateUserData();
    }).catch(error => {
      console.log(error);
      this.miscProvider.createAlert('Error when trying to login', 'Code: ' + error.code, 'Message: ' + error.message);
    });
  }

  private socialSignIn(provider) {
    return this.afAuth.auth.signInWithPopup(provider).then((credential) => {
      this.authState = credential.user;
      //(Optional) Creating or updating user on firebase
      this.updateUserData();
    }).catch(error => {
      console.log(error);
      this.miscProvider.createAlert('Error when trying to login', 'Code: ' + error.code, 'Message: ' + error.message);
    });
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
  emailSignUp(user: User) {
    return this.afAuth.auth.createUserWithEmailAndPassword(user.email, user.password)
      .then((user) => {
        this.authState = user
        this.updateUserData()
      }).catch(error => {
        console.log(error);
        this.miscProvider.createAlert('Error when trying to Sign-Up', 'Code: ' + error.code, 'Message: ' + error.message);
      });
  }

  emailLogin(user: User) {
    return this.afAuth.auth.signInWithEmailAndPassword(user.email, user.password)
      .then((user) => {
        this.authState = user
        this.updateUserData()
      }).catch(error => {
        console.log(error);
        this.miscProvider.createAlert('Error when trying to Sign-In', 'Code: ' + error.code, 'Message: ' + error.message);
      });
  }

  // Sends email allowing user to reset password
  resetPassword(email: string) {
    var auth = firebase.auth();

    return auth.sendPasswordResetEmail(email)
      .then(() => console.log("email sent"))
      .catch((error) => console.log(error))
  }


  //// Sign Out ////
  //TODO maybe have a better way to verify the provider for loggingout
  signOut(): Promise<void> {
    return this.afAuth.auth.signOut().then(success => {
      if (this.platform.is('cordova')) {
        let providerId = this.currentUser.providerData[0].providerId;
        if (providerId === 'google.com') {
          return this.gplus.disconnect();
        }
        else if (providerId === 'facebook.com') {
          return this.fb.logout();
        }
        else if (providerId === 'twitter.com') {
          return this.tw.logout();
        }
      }
    });
  }


  //// Helpers ////
  private updateUserData(): void {
    // Writes user name and email to realtime db
    // useful if your app displays information about users or for admin features
    let path = `users/${this.currentUserId}`; // Endpoint on firebase
    let data = {
      email: this.authState.email,
      displayName: this.authState.displayName,
      photoURL: this.authState.photoURL,
      providerId: this.authState.providerData[0].providerId,
      providerUid: this.authState.providerData[0].uid
    }
    this.db.object(path).update(data).catch(error => {
      console.log(error);
      this.miscProvider.createAlert('Error when saving data to database', 'Code: ' + error.code, 'Message: ' + error.message);
    });
  }




}