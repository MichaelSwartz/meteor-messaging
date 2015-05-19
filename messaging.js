Messages = new Mongo.Collection("messages");
Chats = new Mongo.Collection("chats");

if (Meteor.isClient) {
  Tracker.autorun(function () {
    Meteor.subscribe("messages", {chat: Session.get("selectedChat")});
  });

  Meteor.subscribe("chats");

  Template.message.helpers({
    isAuthor: function () {
      return this.author === Meteor.userId();
    }
  });

  Template.registerHelper('fromNow', function(date) {
    if (date) {
      return moment(date).fromNow();
    }
  });

  Template.chatList.helpers({
    selectedChat: function () {
      selectedChat = Chats.findOne(Session.get("selectedChat"));
      return selectedChat && selectedChat.name;
    }
  });

  Template.body.helpers({
    messages: function () {
      return Messages.find({}, {sort: {createdAt: -1}});
    },

    chats: function () {
      return Chats.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.chat.helpers({
    selected: function () {
      return Session.equals("selectedChat", this._id) ? "selected" : '';
    }
  });

  Template.chat.events({
    'click': function () {
      var chat = this._id;
      Session.set("selectedChat", chat);
      var user = Meteor.userId();
      Meteor.users.update({_id: user}, {$set: {'profile.selectedChat': chat}});
    }
  });

  Template.body.events({
    "submit .new-message": function (event) {
      var text = event.target.text.value;
      var chat = Session.get("selectedChat");

      Meteor.call("addMessage", text, chat);

      event.target.text.value = "";
      return false;
    },

    "submit .new-chat": function (event) {
      var name = event.target.text.value;
      Meteor.call("addChat", name);

      event.target.text.value = "";
      return false;
    }
  });

  Template.message.events({
    "click .delete": function () {
      Meteor.call("deleteMessage", this._id);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.publish("chats", function() {
      return Chats.find();
    });

    Meteor.publish("messages", function () {
      var user = Meteor.users.findOne(this.userId);
      var selectedChat = user.profile.selectedChat;
      return Messages.find({ chat: selectedChat });
    });
  });
}

Meteor.methods({
  addChat: function (name) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Chats.insert({
      name: name,
      createdAt: new Date (),
      owner: Meteor.userId(),
    });
  },

  addMessage: function (text, chat) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Messages.insert({
      text: text,
      createdAt: new Date(),
      author: Meteor.userId(),
      username: Meteor.user().username || Meteor.user().profile.name,
      chat: chat
    });
  },

  deleteMessage: function (messageId) {
    var message = Messages.findOne(messageId);
    if (message.author !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Messages.remove(messageId);
  }
});
