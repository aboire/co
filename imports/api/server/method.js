import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';
import { Push } from 'meteor/raix:push';
import { moment } from 'meteor/momentjs:moment';

//collection et schemas
import { NotificationHistory } from '../notification_history.js';
import { Citoyens,SchemasFollowRest } from '../citoyens.js';
import { News,SchemasNewsRest } from '../news.js';
import { Documents } from '../documents.js';
import { Photosimg } from './photosimg.js';
import { Cities } from '../cities.js';
import { Events,SchemasEventsRest } from '../events.js'

//function api
import { callPixelRest,authPixelRest } from './api.js';

Meteor.methods({
  userup: function(geo) {
    check(geo, {longitude:Number,latitude:Number});
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    if (Citoyens.update({
      _id: new Mongo.ObjectID(this.userId)
    }, {
      $set: {
        'geoPosition': {
          type: "Point",
          'coordinates': [parseFloat(geo.longitude), parseFloat(geo.latitude)]
        }
      }
    })) {
      return true;
    } else {
      return false;
    }
    this.unblock();
  },
  'likePhoto': function(photoId) {
    check(photoId, String);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }

    let doc={};
    doc.id=photoId;
    doc.collection="news";
    doc.action="voteUp";
    let voteQuery={};
    voteQuery["_id"] = new Mongo.ObjectID(photoId);
    voteQuery['voteUp.'+this.userId]={$exists:true};
    console.log(voteQuery);

console.log(JSON.stringify(News.findOne(voteQuery)));

    if (News.findOne(voteQuery)) {
      doc.unset="true";
      Meteor.call('addAction',doc);

    } else {
      let voteQuery={};
      voteQuery["_id"] = new Mongo.ObjectID(photoId);
      voteQuery['voteDown.'+this.userId]={$exists:true};
      console.log(voteQuery);

      if (News.findOne(voteQuery)) {
        let rem={};
        rem.id=photoId;
        rem.collection="news";
        rem.action="voteDown";
        rem.unset="true";
        Meteor.call('addAction',rem);

      }
      Meteor.call('addAction',doc);

    }
  },
  'dislikePhoto': function(photoId) {
    check(photoId, String);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }

    let doc={};
    doc.id=photoId;
    doc.collection="news";
    doc.action="voteDown";
    let voteQuery={};
    voteQuery["_id"] = new Mongo.ObjectID(photoId);
    voteQuery['voteDown.'+this.userId]={$exists:true};
    console.log(voteQuery);

    if (News.findOne(voteQuery)) {
      doc.unset="true";
      Meteor.call('addAction',doc);
    } else {

      let voteQuery={};
      voteQuery["_id"] = new Mongo.ObjectID(photoId);
      voteQuery['voteUp.'+this.userId]={$exists:true};
      console.log(voteQuery);

      if (News.findOne(voteQuery)) {
        let rem={};
        rem.id=photoId;
        rem.collection="news";
        rem.action="voteUp";
        rem.unset="true";
        Meteor.call('addAction',rem);
      }
      Meteor.call('addAction',doc);

    }
  },
  surveyAdAction : function(doc){
    check(doc.id, String);
    check(doc.collection, String);
    check(doc.action, String);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    var retour = Meteor.call("postPixel","survey","addaction",doc);
    return retour;
  },
  addAction : function(doc){
    check(doc.id, String);
    check(doc.collection, String);
    check(doc.action, String);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    var retour = Meteor.call("postPixel","action","addaction",doc);
    return retour;
  },
  followPersonExist : function(connectUserId){
    //type : person / follows
    //connectUserId
    check(connectUserId, String);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    doc={};
    doc.connectUserId=connectUserId;
    var retour = Meteor.call("postPixel","person","follows",doc);
    return retour;
  },
  followPerson : function(doc){
    //type : person / follows
    //invitedUserName
    //invitedUserEmail
    check(doc, SchemasFollowRest);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    var retour = Meteor.call("postPixel","person","follows",doc);
    return retour;
  },
  saveattendeesEvent : function(scope,eventId){
    check(scope, String);
    check(eventId, String);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    doc={};
    doc.parentId=eventId;
    doc.parentType=scope+'s';
    doc.childType="citoyens";
    doc.childId=this.userId;
    var retour = Meteor.call("postPixel","link","connect",doc);
    return retour;
  },
  insertNew : function(doc){
    //type : organizations / projects > organizerId
    console.log(doc);
    check(doc, SchemasNewsRest);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    if(!doc.parentType){
      doc.parentType="events";
    }
    if(!doc.scope){
      doc.scope="public";
    }

    var retour = Meteor.call("postPixel","news","save",doc);

    if(doc.media && doc.media.content && doc.media.content.imageId){
      let image = Photosimg.findOne({_id:doc.media.content.imageId});
      image.on('stored', Meteor.bindEnvironment(function() {
        News.update({_id:new Mongo.ObjectID(retour.data.id["$id"])},{$set:{'media.content.image':'https://communevent.communecter.org'+image.url()}})
      }));
    }

    return retour;
  },
  photoNews: function(photo,str,type,idType) {
    check(str, String);
    check(type, String);
    check(idType, String);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    var newsId;
    var photoret = Meteor.call('cfsbase64tos3up',photo,str,type,idType);
    console.log(photoret)
    let insertNew = {};
    insertNew.parentId=idType;
    insertNew.parentType=type;
    insertNew.text="photo";
    insertNew["media"]={};
    insertNew["media"]["type"]="url_content";
    //insertNew.media.name="";
    //insertNew.media.description="";
    insertNew["media"]["content"]={};
    insertNew["media"]["content"]["type"]="img_link";
    //insertNew.media.content.url="";
    //insertNew["media"]["content"]["image"]=image.url();
    insertNew["media"]["content"]["imageId"]=photoret;
    insertNew["media"]["content"]["imageSize"]="large";
    //insertNew.media.content.videoLink="";
    newsId = Meteor.call('insertNew',insertNew);
    console.log(newsId);
    if(photoret && newsId){
      let image = Photosimg.findOne({_id:photoret});
      image.on('stored', Meteor.bindEnvironment(function() {
        News.update({_id:new Mongo.ObjectID(newsId.data.id["$id"])},{$set:{'media.content.image':'https://communevent.communecter.org'+image.url()}})
        if(Documents.find({objId:photoret}).count()==0){
          let insertDoc = {};
          insertDoc.id = idType;
          insertDoc.type = "events";
          insertDoc.folder = "cfs/files/photosimg/"+photoret;
          insertDoc.objId = photoret;
          insertDoc.moduleId = "communevent";
          insertDoc.doctype = "image";
          insertDoc.name = image.name();
          insertDoc.size = image.size();
          insertDoc.contentKey = "slider";
          console.log(insertDoc);
          let docId = Documents.insert(insertDoc);
          console.log(docId);
        }
      }));
      return {photoret:photoret,newsId:newsId.data.id["$id"]};
    }else{
      throw new Meteor.Error("photoNews error");
    }
  },
  photoNewsUpdate: function(newsId,photoId) {
    check(newsId, String);
    check(photoId, String);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    let parentId = News.findOne({_id:new Mongo.ObjectID(newsId)}).target.id;
    let media={};
    media["type"]="url_content";
    media["content"]={};
    media["content"]["type"]="img_link";
    media["content"]["imageId"]=photoId;
    media["content"]["imageSize"]="large";
    console.log(media);
    News.update({_id:new Mongo.ObjectID(newsId)},{$set:{'media':media}});

    let image = Photosimg.findOne({_id:photoId});
    image.on('stored', Meteor.bindEnvironment(function() {
      News.update({_id:new Mongo.ObjectID(newsId)},{$set:{'media.content.image':'https://communevent.communecter.org'+image.url()}});

      if(Documents.find({objId:photoId}).count()==0){
        let insertDoc = {};
        insertDoc.id = parentId;
        insertDoc.type = "events";
        insertDoc.folder = "cfs/files/photosimg/"+photoId;
        insertDoc.objId = photoId;
        insertDoc.moduleId = "communevent";
        insertDoc.doctype = "image";
        insertDoc.name = image.name();
        insertDoc.size = image.size();
        insertDoc.contentKey = "slider";
        console.log(insertDoc);
        let docId = Documents.insert(insertDoc);
        console.log(docId);
      }

    }));

    return image._id;
  },
  cfsbase64tos3up: function(photo,str,type,idType) {
    check(photo, Match.Any);
    check(str, Match.Any);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    var fsFile = new FS.File();
    fsFile.attachData(photo,{'type':'image/jpeg'});
    fsFile.extension('jpg');
    fsFile.name(str);
    fsFile.metadata = {owner: this.userId,type:type,id:idType};
    fsFile.on('error', function (error) {
      console.log(error);
    });
    fsFile.on("uploaded", function () {
      console.log(error);
    });

    var photoret=Photosimg.insert(fsFile);

    return photoret._id;
  },
  insertEvent : function(doc){
    //type : organizations / projects > organizerId
    check(doc, SchemasEventsRest);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    if(doc.startDate){
      doc.startDate=moment(doc.startDate).format();
    }
    if(doc.endDate){
      doc.endDate=moment(doc.endDate).format();
    }
    if(!doc.organizerId){
      doc.organizerId=this.userId;
    }
    if(!doc.organizerType){
      doc.organizerType="citoyens";
    }
    var retour = Meteor.call("postPixel","event","save",doc);
    return retour;
  },
  updateEvent : function(modifier,documentId){
    check(documentId, String);
    check(modifier, SchemasEventsRest);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    if(modifier["$set"].startDate){
      modifier["$set"].startDate=moment(modifier["$set"].startDate).format();
    }
    if(modifier["$set"].endDate){
      modifier["$set"].endDate=moment(modifier["$set"].endDate).format();
    }
    if(!modifier["$set"].organizerId){
      modifier["$set"].organizerId=this.userId;
    }
    if(!modifier["$set"].organizerType){
      modifier["$set"].organizerType="citoyens";
    }
    modifier["$set"].eventId=documentId;
    var retour = Meteor.call("postPixel","event","update",modifier["$set"]);
    return retour;
  },
  postPixel : function(controller,action,params){
    check(controller, String);
    check(action, String)
    check(params, Object);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    var userC = Meteor.users.findOne({_id:this.userId});
    console.log(userC.services.resume.loginTokens[0].hashedToken);
    if(userC && userC.services && userC.services.resume && userC.services.resume.loginTokens && userC.services.resume.loginTokens[0] && userC.services.resume.loginTokens[0].hashedToken){
      var retour = callPixelRest(userC.services.resume.loginTokens[0].hashedToken,"POST",controller,action,params);
      console.log(retour);
      return retour;
    }else{
      throw new Meteor.Error("Error server");
    }
    //try {
    /*} catch(e) {
    throw new Meteor.Error("Error server");
  }*/
},
createUserAccount: function(user){
  console.log(user);
  check(user, Object);
  check(user.name, String);
  check(user.username, String);
  check(user.email, String);
  check(user.password, String);
  check(user.codepostal, String);
  check(user.city, String);

  var passwordTest = new RegExp("(?=.{8,}).*", "g");
  if (passwordTest.test(user.password) == false) {
    throw new Meteor.Error("Password is Too short");
  }

  var emailTest = new RegExp(/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/);
  if (emailTest.test(user.email) == false) {
    throw new Meteor.Error("Email not valid");
  }

  if (Citoyens.find({email: user.email}).count() !== 0) {
    throw new Meteor.Error("Email not unique");
  }

  if (Citoyens.find({username: user.username}).count() !== 0) {
    throw new Meteor.Error("Username not unique");
  }

  var pswdDigest = SHA256(user.email+user.password)

  let insee = Cities.findOne({insee: user.city});

  let userId = Citoyens.insert({
    name: user.name,
    email: user.email,
    pwd: pswdDigest,
    created: new Date(),
    address: {
      addressLocality: insee.alternateName,
      codeInsee: insee.insee,
      postalCode:insee.cp
    },
    geo: {
      latitude: insee.geo.latitude,
      longitude: insee.geo.longitude
    },
    geoPosition: {
      type: "Point",
      coordinates : [parseFloat(insee.geo.longitude),parseFloat(insee.geo.latitude)]
    }});
    return userId;
  },
  createUserAccountRest: function(user){
    console.log(user);
    check(user, Object);
    check(user.name, String);
    check(user.username, String);
    check(user.email, String);
    check(user.password, String);
    check(user.codepostal, String);
    check(user.city, String);

    var passwordTest = new RegExp("(?=.{8,}).*", "g");
    if (passwordTest.test(user.password) == false) {
      throw new Meteor.Error("Password is Too short");
    }

    var emailTest = new RegExp(/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/);
    if (emailTest.test(user.email) == false) {
      throw new Meteor.Error("Email not valid");
    }

    if (Citoyens.find({email: user.email}).count() !== 0) {
      throw new Meteor.Error("Email not unique");
    }

    if (Citoyens.find({username: user.username}).count() !== 0) {
      throw new Meteor.Error("Username not unique");
    }

    let insee = Cities.findOne({insee: user.city});

    try {
      var response = HTTP.call( 'POST', 'http://qa.communecter.org/communecter/person/register', {
        params: {
          "name": user.name,
          "email": user.email,
          "username" : user.username,
          "pwd": user.password,
          "cp": insee.cp,
          "city": insee.insee,
          "geoPosLatitude": insee.geo.latitude,
          "geoPosLongitude": insee.geo.longitude
        }
      });
      console.log(response);
      if(response.data.result && response.data.id){
        let userId = response.data.id;
        return userId;
      }else{
        throw new Meteor.Error(response.data.msg);
      }
    } catch(e) {
      throw new Meteor.Error("Error server");
    }


  },
  deletePhoto: function(photoId) {
    check(photoId, String);
    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }
    var photo = Documents.findOne({
      id: photoId
    }, {
      "fields": {
        objId: 1
      }
    });
    if (photo && photo.objId) {
      /*var s3 = new AWS.S3();
      var params = {
      Bucket: Meteor.settings.aws.bucket,
      Key: photo.urlimage
    };
    s3.deleteObject(params, function(err, data) {
    if (err) console.log(err, err.stack); // error
    else console.log(); // deleted
  })*/
  News.remove({
    _id: new Mongo.ObjectID(photoId),
    author: this.userId
  });
  Documents.remove({
    id: photoId,
    author: this.userId
  });
  Photosimg.remove({_id:photo.objId})
}else{
  News.remove({
    _id: new Mongo.ObjectID(photoId),
    author: this.userId
  });
}
},
getcitiesbylatlng: function(latlng) {
  check(latlng, {latitude:Number,longitude:Number});
  Cities._ensureIndex({
    "geoShape": "2dsphere"
  });
  return Cities.findOne({"geoShape":
  {$geoIntersects:
    {$geometry:{ "type" : "Point",
    "coordinates" : [ latlng.longitude, latlng.latitude ] }
  }
}
},{_disableOplog: true});
},
getcitiesbypostalcode: function(cp) {
  check(cp, String);
  return Cities.find({'postalCodes.postalCode': cp}).fetch();
},
searchCities : function(query, options){
  check(query, String);
  if (!query) return [];

  options = options || {};

  // guard against client-side DOS: hard limit to 50
  if (options.limit) {
    options.limit = Math.min(50, Math.abs(options.limit));
  } else {
    options.limit = 50;
  }

  // TODO fix regexp to support multiple tokens
  var regex = new RegExp("^" + query);
  return Cities.find({$or : [{name: {$regex:  regex, $options: "i"}},{'postalCodes.postalCode': {$regex:  regex}}]}, options).fetch();
},
pushNewAttendees : function(eventId){
  check(eventId, String);
  if (!this.userId) {
    throw new Meteor.Error("not-authorized");
  }
  let user = Citoyens.findOne({_id: new Mongo.ObjectID(this.userId)});
  let event = Events.findOne({_id: new Mongo.ObjectID(eventId)});
  if(news && event && event.links && event.links.attendees){
    let attendeesIdsTmp = _.map(event.links.attendees, function(attendees,key){
      return key;
    });
    let attendeesIds = _.filter(attendeesIdsTmp, function(attendees){
      return attendees!=this.userId;
    },this);
    console.log(attendeesIds);
    let title = event.name;
    var text = user.name;
    let payload = {};
    payload['title'] = title;
    payload['pushType'] = 'news';
    payload['newsId'] = newsId;
    payload['eventId'] = eventId;
    payload['scope'] = 'events';

    let query = {};
    query['userId'] = {$in:attendeesIds};
    Meteor.call('pushUser',title,text,payload,query);

  }else{
    throw new Meteor.Error("not-event-news");
  }
},
pushNewNewsAttendees : function(eventId,newsId){
  check(newsId, String);
  check(eventId, String);
  if (!this.userId) {
    throw new Meteor.Error("not-authorized");
  }
  let news = News.findOne({_id: new Mongo.ObjectID(newsId)});
  let event = Events.findOne({_id: new Mongo.ObjectID(eventId)});
  if(news && event && event.links && event.links.attendees){
    let attendeesIdsTmp = _.map(event.links.attendees, function(attendees,key){
      return key;
    });
    let attendeesIds = _.filter(attendeesIdsTmp, function(attendees){
      return attendees!=this.userId;
    },this);
    console.log(attendeesIds);
    let title = event.name;
    if(news.name){
      var text = news.name;
    }else{
      var text = 'nouvelle news';
    }
    let link = '/events/news/'+eventId+'/new/'+newsId;


    let payload = {};
    payload['title'] = title;
    payload['text'] = text;
    payload['pushType'] = 'news';
    payload['newsId'] = newsId;
    payload['eventId'] = eventId;
    payload['scope'] = 'events';
    payload['link'] = link;
    payload['expiration'] = event.endDate;
    payload['addedAt'] =  new Date();
    payload['userId'] = attendeesIds;
    payload['author'] = this.userId;

    let notifId=Meteor.call('insertNotification',payload);
    //let badge=Meteor.call('alertCount',);
    payload['notifId'] = notifId;
    let query = {};

    //envoie d'un coup sans badge
    //query['userId'] = {$in:attendeesIds.map};
    //Meteor.call('pushUser',title,text,payload,query,badge);

    //envoyer user par user si je veux badger
    _.each(attendeesIds,function(value){
      query['userId'] = value;
      let badge=Meteor.call('alertCount',value);
      console.log(badge);
      Meteor.call('pushUser',title,text,payload,query,badge);
    },title,text,payload,query);


  }else{
    throw new Meteor.Error("not-event-news");
  }
},
pushUser : function(title,text,payload,query,badge){
  check(title, String);
  check(text, String);
  check(payload, Object);
  check(query, Object);
  Push.send({
    from: 'communEvent',
    title: title,
    text: text,
    payload: payload,
    sound: 'default',
    query: query,
    badge: badge
  });
},
'insertNotification':function(notifObj){
  if (!this.userId) {
    throw new Meteor.Error("not-authorized");
  }
  return  NotificationHistory.insert(notifObj)

},
'markRead': function(notifId) {
  if (!this.userId) {
    throw new Meteor.Error("not-authorized");
  }
  // console.log('mark as read click') // for testing
  return NotificationHistory.update({
    '_id': notifId
  }, {
    $addToSet: {
      'dismissals': this.userId
    }
  })
},
'alertCount':function(attendeesId){
  if (!this.userId) {
    throw new Meteor.Error("not-authorized");
  }
  return NotificationHistory.find({
    'expiration': {
      $gt: new Date()
    },
    'dismissals': {
      $nin: [attendeesId]
    },
    'userId': {
      $in: [attendeesId]
    }
  }).count();
},
'registerClick': function(notifId) {
  if (!this.userId) {
    throw new Meteor.Error("not-authorized");
  }
  // console.log('notification click') // for testing
  return NotificationHistory.update({
    '_id': notifId
  }, {
    $addToSet: {
      'clicks': this.userId
    }
  })
},
'allRead': function() {
  if (!this.userId) {
    throw new Meteor.Error("not-authorized");
  }
  // console.log('notification click') // for testing
  return NotificationHistory.update({
    'dismissals': {
      $nin: [this.userId]
    },
    'userId': {
      $in: [this.userId]
    }
  }, {
    $addToSet: {
      'dismissals': this.userId
    }
  },{ multi: true})
}
});