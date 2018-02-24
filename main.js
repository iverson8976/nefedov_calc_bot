'use strict';

var path = require('path');
var request = require('request');

// Init secret bot token. This file is not added to GIT. When deployed, 
// it should contain the following content: 
// { "token": "000000000:AAAAA-AAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }   you can get it from @BotFather when you create your bot
var TOKEN = require('./config.json').token;

var baseRequest = request.defaults({
    baseUrl: 'https://api.telegram.org/bot' + TOKEN + '/'
});

var showError = function (err) {
    if(err) { console.log(err); }
};

var callMethod = function (methodName, params, callback) {
    callback = callback || showError;
    var req = {uri: methodName, method: 'POST'};
    if (Object.keys(params).length) {
        req.formData = params;
    }
    baseRequest(req, function (err, response, body) {        
        if (err) {
            return callback(err);
        }
        callback(err, JSON.parse(body));
    });
};

var updatesOffset = 0;

var getUpdates = function (callback) {
    var params = {offset: updatesOffset, timeout: 100};
    callMethod('getUpdates', params, function (err, data) {
        if (err) {
            return callback(err);
        }
        if (data.result.length) {
            updatesOffset = data.result[data.result.length - 1].update_id + 1;
        }
        callback(err, data);
    });
}

var keyboard = JSON.stringify({
    inline_keyboard: [
        [
            {text: 'AC', callback_data: 'AC'},
            {text: '->', callback_data: '->'}
        ],
        [
            {text: '.', callback_data: '.'}, 
            {text: '+', callback_data: '+'},
            {text: '-', callback_data: '-'}
        ],
        [
            {text: '*', callback_data: '*'}, 
            {text: '/', callback_data: '/'},
            {text: '=', callback_data: '='}
        ],
        [
            {text: '1', callback_data: '1'}, 
            {text: '2', callback_data: '2'},
            {text: '3', callback_data: '3'}
        ],
        [
            {text: '4', callback_data: '4'}, 
            {text: '5', callback_data: '5'},
            {text: '6', callback_data: '6'}
        ],
        [
            {text: '7', callback_data: '7'}, 
            {text: '8', callback_data: '8'},
            {text: '9', callback_data: '9'}
        ],
        [
            {text: '0', callback_data: '0'}
        ]
    ]
});

function toRightSide (text) {                                   // function which tries to get text at the right side
    var whiteSpace = ' ';
    var maxStringLength = 56;
    for (var i = 1; i < maxStringLength - text.length; i++) {
        whiteSpace += ' ';
    }
    
    return (whiteSpace + text);
}

var messageHandler = function (update) {
    
    if (update.callback_query) {        // user presses some buttons at inline keyboard
        
    var previousText = (update.callback_query.message.text).replace(/^\s*/,'');         // delete space from beginning of message.text which will be edited;
    var previousTextArr = previousText.split(' ');
    
    var botMessageId = update.callback_query.message.message_id;                        // message_id of bot which will be edited

// variables for calculator
//        **************************************************
        var afterEqual = false;                                 // flag, was last action '=', or not
        if (previousTextArr[0] == '=') {
            afterEqual = true;
            var firstNumb = previousTextArr[1];                 // first number of equation
            var action = '';                                    // +, -, *, /
            var secondNumb = '';                                // second number of equation
        } else {
            var firstNumb = previousTextArr[0];                 
            var action = previousTextArr[1] || '';              
            var secondNumb = previousTextArr[2] || '';          
        }
        
        var allCurrentState = '';                           // current state of equation for demonstration
        var answer = '';                                    // answer of calculation        
//        **************************************************

//        for debugging
//        **************************************************
//        console.log(update);
//        console.log('data = '+update.callback_query.data);
//        console.log('firstNumb = '+firstNumb);
//        console.log('action = '+action);
//        console.log('secondNumb = '+secondNumb);
//        **************************************************

//        all logic of calculator ************************************************** begin   
        
        if (update.callback_query.data == 'AC') {  
            firstNumb = '0';
            action = '';
            secondNumb = '';           
        } else if (!(update.callback_query.data-0) && update.callback_query.data != 0) {
            if (update.callback_query.data == '->') {
                afterEqual = false;
                allCurrentState = (firstNumb + ' ' + action + ' ' + secondNumb).replace(/\s*$/,'');         // delete space from end of string
                allCurrentState = allCurrentState.substring(0, allCurrentState.length - 1);
                var allCurrentStateArray = allCurrentState.split(' ');
                firstNumb = allCurrentStateArray[0] || '0';
                action = allCurrentStateArray[1] || '';
                secondNumb = allCurrentStateArray[2] || ''; 
            } else if (update.callback_query.data == '=') {
                var result = eval(firstNumb + action + secondNumb);
                answer = toRightSide ('= ' + result);
                action = '';
                secondNumb = '';
                firstNumb = '' + result;
                return callMethod('editMessageText', {
                    chat_id: update.callback_query.message.chat.id, 
                    message_id: botMessageId, 
                    text: '<code>' + answer + '</code>', 
                    parse_mode: 'HTML', 
                    reply_markup: keyboard
                });
            } else if (update.callback_query.data == '.') {
                if (afterEqual) {
                    firstNumb = '0';
                }
                if (secondNumb == '') {
                    if (action == '') {
                        if (firstNumb.indexOf('.') == -1) {
                            firstNumb += '.';
                        }
                    } else {
                        if (secondNumb.indexOf('.') == -1) {
                            secondNumb = '0.';
                        }
                    }
                } else {
                    if (secondNumb.indexOf('.') == -1) {
                        secondNumb += '.';
                    }
                }
            } else {                
                if (secondNumb != '') {
                    firstNumb = '' + eval(firstNumb + action + secondNumb);
                    action = update.callback_query.data;
                    secondNumb = '';
                } else {
                    action = update.callback_query.data;
                }
            }            
        } else if (action == '' && firstNumb == '0') {
            firstNumb = update.callback_query.data;            
        } else if (action == '' && firstNumb != '0') {
            firstNumb = firstNumb + update.callback_query.data;
            if (afterEqual) {
                firstNumb = update.callback_query.data;
            }
        } else if (action != '' && (secondNumb == '' || secondNumb == '0')) {
            secondNumb = update.callback_query.data;
        } else if (action != '' && secondNumb != '') {
            secondNumb = secondNumb + update.callback_query.data;
        }
        allCurrentState = toRightSide (firstNumb + ' ' + action + ' ' + secondNumb);  
        
//        all logic of calculator ************************************************** end

        return callMethod('editMessageText', {
            chat_id: update.callback_query.message.chat.id, 
            message_id: botMessageId, 
            text: '<code>' + allCurrentState + '</code>', 
            parse_mode: 'HTML', 
            reply_markup: keyboard
        });
    }

    if (update.message.text == '/start') {                          // send message '0' and show inline_keyboard in the beginning
        botMessageId = update.message.message_id + 1;               // id of last message of bot with inline_keyboard
        firstNumb = '0';                                            // clearing variables of calculator
        action = '';
        secondNumb = '';
        return callMethod('sendMessage', {
            chat_id: update.message.chat.id, 
            text: '<code>' + toRightSide ('0') + '</code>', 
            parse_mode: 'HTML' , 
            reply_markup: keyboard
        });
    }   
    
    var text = 'Используйте предложенную ботом клавиатуру.(См.выше)';               // case when user uses default keyboard
    callMethod('sendMessage', {chat_id: update.message.chat.id, text: text});
};

var runBot = function () {
    getUpdates(function (err, data) {
        if (err) {
            console.log(err);
            return runBot();
        }
        if (!data.ok) {
            console.log(data);
            return runBot();
        }
        data.result.map(messageHandler);
        runBot();
    });
};

callMethod('getMe', {}, function (err, data) {     // initialization of bot 
    if (err) {
        throw err;
    }
    runBot();
});