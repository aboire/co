import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
// import { Counts } from 'meteor/tmeasday:publish-counts';
import { Counter } from 'meteor/natestrauser:publish-performant-counts';

export const ActivityStream = new Mongo.Collection('activityStream', { idGeneration: 'MONGO' });

ActivityStream.api = {
  Unseen (userId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    if (Counter.get(`notifications.${bothUserId}.Unseen`)) {
      return Counter.get(`notifications.${bothUserId}.Unseen`);
    }
    return undefined;
  },
  UnseenAsk (userId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    if (Counter.get(`notifications.${bothUserId}.UnseenAsk`)) {
      return Counter.get(`notifications.${bothUserId}.UnseenAsk`);
    }
    return undefined;
  },
  Unread (userId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    if (Counter.get(`notifications.${bothUserId}.Unread`)) {
      return Counter.get(`notifications.${bothUserId}.Unread`);
    }
    return undefined;
  },
  queryUnseen (userId, scopeId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    const bothScopeId = (typeof scopeId !== 'undefined') ? scopeId : false;
    const queryUnseen = { type: { $ne: 'oceco' } };
    queryUnseen[`notify.id.${bothUserId}`] = { $exists: 1 };
    queryUnseen[`notify.id.${bothUserId}.isUnseen`] = true;
    if (bothScopeId) {
      queryUnseen['target.id'] = bothScopeId;
    }
    return ActivityStream.find(queryUnseen, { fields: { _id: 1 } });
  },
  queryUnseenAsk (userId, scopeId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    const bothScopeId = (typeof scopeId !== 'undefined') ? scopeId : false;
    const queryUnseen = { type: { $ne: 'oceco' } };
    queryUnseen[`notify.id.${bothUserId}`] = { $exists: 1 };
    queryUnseen[`notify.id.${bothUserId}.isUnseen`] = true;
    if (bothScopeId) {
      queryUnseen['target.id'] = bothScopeId;
      queryUnseen.verb = { $in: ['ask'] };
    }
    return ActivityStream.find(queryUnseen, { fields: { _id: 1 } });
  },
  queryUnread (userId, scopeId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    const bothScopeId = (typeof scopeId !== 'undefined') ? scopeId : false;
    const queryUnread = { type: { $ne: 'oceco' } };
    queryUnread[`notify.id.${bothUserId}`] = { $exists: 1 };
    queryUnread[`notify.id.${bothUserId}.isUnread`] = true;
    if (bothScopeId) {
      queryUnread['target.id'] = bothScopeId;
    }
    return ActivityStream.find(queryUnread, { fields: { _id: 1 } });
  },
  isUnread (userId, scopeId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    const bothScopeId = (typeof scopeId !== 'undefined') ? scopeId : false;
    const query = { type: { $ne: 'oceco' } };
    query[`notify.id.${bothUserId}`] = { $exists: 1 };
    if (bothScopeId) {
      query.verb = { $nin: ['ask'] };
      query['target.id'] = bothScopeId;
    } else {
      query[`notify.id.${bothUserId}.isUnread`] = true;
    }
    const options = {};
    options.sort = { created: -1 };
    options.fields = {};
    options.fields[`notify.id.${bothUserId}.isUnread`] = 1;
    options.fields[`notify.id.${bothUserId}.isUnseen`] = 1;
    options.fields['notify.displayName'] = 1;
    options.fields['notify.labelArray'] = 1;
    options.fields['notify.icon'] = 1;
    options.fields['notify.url'] = 1;
    options.fields['notify.objectType'] = 1;
    options.fields.verb = 1;
    options.fields.target = 1;
    options.fields.object = 1;
    options.fields.created = 1;
    options.fields.author = 1;
    options.fields.type = 1;
    return ActivityStream.find(query, options);
  },
  isUnseen (userId, scopeId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    const bothScopeId = (typeof scopeId !== 'undefined') ? scopeId : false;
    const query = { type: { $ne: 'oceco' } };
    query[`notify.id.${bothUserId}`] = { $exists: 1 };
    if (bothScopeId) {
      query['target.id'] = bothScopeId;
    } else {
      query[`notify.id.${bothUserId}.isUnseen`] = true;
    }
    const options = {};
    options.sort = { created: -1 };
    /* options['fields'] = {}
    options['fields'][`notify.id.${bothUserId}`] = 1;
    options['fields']['notify.displayName'] = 1;
    options['fields']['notify.icon'] = 1;
    options['fields']['notify.url'] = 1;
    options['fields']['notify.objectType'] = 1;
    options['fields']['verb'] = 1;
    options['fields']['target'] = 1;
    options['fields']['created'] = 1;
    options['fields']['author'] = 1;
    options['fields']['type'] = 1; */
    return ActivityStream.find(query, options);
  },
  isUnseenAsk (userId, scopeId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    const bothScopeId = (typeof scopeId !== 'undefined') ? scopeId : false;
    const query = { type: { $ne: 'oceco' } };
    query.verb = { $in: ['ask'] };
    query[`notify.id.${bothUserId}`] = { $exists: 1 };
    if (bothScopeId) {
      query['target.id'] = bothScopeId;
    } else {
      query[`notify.id.${bothUserId}.isUnseen`] = true;
    }
    const options = {};
    options.sort = { created: -1 };
    /* options['fields'] = {}
    options['fields'][`notify.id.${bothUserId}`] = 1;
    options['fields']['notify.displayName'] = 1;
    options['fields']['notify.icon'] = 1;
    options['fields']['notify.url'] = 1;
    options['fields']['notify.objectType'] = 1;
    options['fields']['verb'] = 1;
    options['fields']['target'] = 1;
    options['fields']['created'] = 1;
    options['fields']['author'] = 1;
    options['fields']['type'] = 1; */
    return ActivityStream.find(query, options);
  },
  isUnreadAsk (userId, scopeId) {
    const bothUserId = (typeof userId !== 'undefined') ? userId : Meteor.userId();
    const bothScopeId = (typeof scopeId !== 'undefined') ? scopeId : false;
    const query = { type: { $ne: 'oceco' } };
    query.verb = { $in: ['ask'] };
    query[`notify.id.${bothUserId}`] = { $exists: 1 };
    if (bothScopeId) {
      query['target.id'] = bothScopeId;
    } else {
      query[`notify.id.${bothUserId}.isUnread`] = true;
    }
    const options = {};
    options.sort = { created: -1 };
    options.fields = {};
    options.fields[`notify.id.${bothUserId}`] = 1;
    options.fields['notify.displayName'] = 1;
    options.fields['notify.labelArray'] = 1;
    options.fields['notify.icon'] = 1;
    options.fields['notify.url'] = 1;
    options.fields['notify.objectType'] = 1;
    options.fields.verb = 1;
    options.fields.target = 1;
    options.fields.object = 1;
    options.fields.created = 1;
    options.fields.author = 1;
    options.fields.type = 1;
    return ActivityStream.find(query, options);
  },
};

ActivityStream.helpers({
  authorId () {
    const keyArray = _.map(this.author, (a, k) => k);
    return keyArray[0];
  },
});
