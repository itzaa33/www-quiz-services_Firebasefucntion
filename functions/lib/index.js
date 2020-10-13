"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
// var firebase = require('firebase');
// require('firebase/firestore');
// require('firebase/storage');
// import * as firebase from 'firebase';
// import 'firebase/firestore';
// import 'firebase/storage'
// const PubSub = require('@google-cloud/pubsub');
// const pubsub = new PubSub();
// const topic = pubsub.topic('update_ranking');
// const publisher = topic.publisher();
const cors = require('cors')({
    origin: true
});
admin.initializeApp();
exports.Admin = require('./Admin');
exports.getQuizsTitle = functions.https.onRequest((request, response) => {
    // var datetime = admin.firestore.FieldValue.serverTimestamp();
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const obj = yield getQuizdata();
        response.send(obj);
    }));
});
function getQuizdata() {
    return __awaiter(this, void 0, void 0, function* () {
        var datetime = new Date();
        const items = [];
        try {
            const data = yield admin.firestore().collection('quizzes').where('Time_Start', "<=", datetime).get();
            if (data !== null) {
                data.forEach(doc => {
                    if (doc.get('Time_End') >= datetime) {
                        items.push(Object.assign({ id: doc.id }, doc.data()));
                    }
                });
            }
        }
        catch (err) {
            console.log(err);
        }
        return items;
    });
}
exports.getQuizsform = functions.https.onRequest((request, response) => {
    // var datetime = admin.firestore.FieldValue.serverTimestamp();
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        var quiz = [];
        var res = [];
        try {
            const items = yield getQuizdata();
            const id = items[0].id;
            let data = yield admin.firestore().collection('quizzes/' + id + '/questions').get();
            data.forEach(doc => {
                let choice = shuffleChoice(items[0].choice, doc.get('result_true'));
                quiz.push({
                    id_quiz: id,
                    id: doc.id,
                    Index: doc.get('Index'),
                    Proposition: doc.get('Proposition'),
                    Picture: doc.get('Picture'),
                    Choice: choice,
                });
            });
            res = shuffle(quiz, quiz.length);
            response.send(res);
        }
        catch (err) {
            console.log('err');
            response.status(500).send(err);
        }
    }));
});
function shuffleChoice(array, ture_choice) {
    var length = array.length;
    var save_index = [];
    var count = 4;
    var res_arr = [];
    if (count > length) {
        count = length;
    }
    while (count > 0) {
        let check_index = false;
        let index = Math.floor(Math.random() * length);
        for (let i = 0; i < save_index.length; i++) {
            if (save_index[i] === index) {
                check_index = true;
            }
        }
        if (check_index === false) {
            save_index.push(index);
            res_arr.push(array[index]);
            count--;
        }
    }
    count = 4;
    while (count > 0) {
        let check_index = false;
        for (let i = 0; i < res_arr.length; i++) {
            if (res_arr[i] === ture_choice) {
                check_index = true;
                count = 0;
            }
        }
        if (check_index === false) {
            let index_add = Math.floor(Math.random() * res_arr.length);
            res_arr[index_add] = ture_choice;
            count = 0;
        }
    }
    return res_arr;
}
function shuffle(array, length) {
    // let counter = array.length;
    let counter = length;
    // While there are elements in the array
    // while (counter > 0) {
    //     // Pick a random index
    //     let index = Math.floor(Math.random() * counter);
    //     // Decrease counter by 1
    //     counter--;
    //     // And swap the last element with it
    //     let temp = array[counter];
    //     array[counter] = array[index];
    //     array[index] = temp;
    // }
    //--------------------------------- step 2--------------------
    let save_index = [];
    let count = 50; //Number of questions
    let res_arr = [];
    if (count > counter) {
        count = counter;
    }
    while (count > 0) {
        let check_index = false;
        let index = Math.floor(Math.random() * counter);
        for (let i = 0; i < save_index.length; i++) {
            if (save_index[i] === index) {
                check_index = true;
            }
        }
        if (check_index === false) {
            save_index.push(index);
            res_arr.push(array[index]);
            count--;
        }
    }
    // return array;
    return res_arr;
}
exports.post_calculate_point = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const form = request.body;
        const form_quiz = form.form_quiz;
        let point = 0;
        const user_data = JSON.parse(form.user_data);
        const id_user = yield checkAuth_user(form.idToken_user);
        const promises = [];
        var true_quiz = 0;
        var false_quiz = 0;
        if (id_user !== null) {
            if (form_quiz.length >= 0 && form_quiz.length <= 60) {
                for (let i = 0; i < form_quiz.length; i++) {
                    let id_proposition = form_quiz[i].id_proposition;
                    let choice = form_quiz[i].choice;
                    promises.push(admin
                        .firestore()
                        .doc('quizzes/' + form.id_quiz + '/questions/' + id_proposition)
                        .get()
                        .then(data => {
                        if (data.get('result_true') === choice.toString()) {
                            return 1;
                        }
                        return 0;
                    }));
                }
                Promise.all(promises).then(arr => {
                    var point_promise = 0;
                    if (arr.length > 0) {
                        for (let i = 0; i < arr.length; i++) {
                            if (arr[i] === 1) {
                                point_promise = point_promise + 10;
                                true_quiz++;
                                console.log("point_promise = " + point_promise);
                            }
                            else {
                                point_promise = point_promise - 10;
                                false_quiz++;
                            }
                        }
                    }
                    point = point_promise;
                    return point_promise;
                })
                    .then((point_return) => __awaiter(this, void 0, void 0, function* () {
                    yield add_pointUser(form.id_quiz, id_user, point_return, form.datetime, true_quiz, false_quiz);
                    yield update_ranking(form.id_quiz, id_user, point_return, form.datetime, user_data, 1, true_quiz, false_quiz);
                    response.end();
                }))
                    .catch(err => {
                    console.log(err);
                    response.status(500);
                });
            }
            else {
                yield add_pointUser(form.id_quiz, id_user, point, form.datetime, true_quiz, false_quiz);
                yield update_ranking(form.id_quiz, id_user, point, form.datetime, user_data, 1, true_quiz, false_quiz);
                response.end();
            }
        }
        else {
            response.status(404);
        }
    }));
});
exports.Update_User = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        try {
            const form = request.body;
            var user_data = JSON.parse(form.user_data);
            const id_quiz = yield getQuizdata();
            if (id_quiz !== undefined) {
                yield update_ranking(id_quiz[0].id, user_data.uid, 0, new Date(), user_data, 0, 0, 0);
            }
            response.end();
        }
        catch (err) {
            console.log(err);
            response.send({ message: err });
        }
    }));
});
// function HandlePubsub_pubsub_update_ranking(id_quiz, id_user, point, datetime, user_data, valueForm) {
//     const msg = {
//         id_quiz,
//         id_user,
//         point,
//         datetime,
//         user_data,
//         valueForm,
//     }
//     const data = Buffer.from(JSON.stringify(msg))
//     publisher.publish(data, err => {
//         if (err) {
//             console.log("error add_pointUser = " + err)
//         }
//         else {
//             console.log("Success = " + data)
//         }
//     })
// }
function checkAuth_user(idToken_user) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const decodedToken = yield admin.auth().verifyIdToken(idToken_user);
            if (decodedToken.user_id !== null) {
                return decodedToken.user_id;
            }
            return null;
        }
        catch (err) {
            console.log(err);
        }
    });
}
function add_pointUser(id_quiz, id_user, point, datetime, true_quiz, false_quiz) {
    return __awaiter(this, void 0, void 0, function* () {
        const setData = {
            id_user: id_user,
            point: point,
            true_quiz: true_quiz,
            false_quiz: false_quiz,
            Time_stamp: new Date(datetime),
        };
        try {
            if (id_quiz !== null && id_quiz !== undefined) {
                yield admin.firestore().collection('quizzes/' + id_quiz + '/history_point').add(setData);
                //await update_ranking(id_quiz, id_user, point, datetime)
            }
        }
        catch (err) {
            console.log(err);
        }
    });
}
// export const pubsub_update_ranking = functions.pubsub.topic('update_ranking').onPublish(async (message) => {
//     try {
//         console.log("message = " + message)
//         const { id_quiz, id_user, point, datetime, user_data, valueForm } = message.json;
//         await update_ranking(id_quiz, id_user, point, datetime, user_data, valueForm)
//     }
//     catch (err) {
//         console.log("error pubsub_update_ranking = " + err)
//     }
// })
function update_ranking(id_quiz, id_user, point, datetime, user_data, valueForm, true_quiz, false_quiz) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var form_rank = yield admin.firestore().collection('quizzes/' + id_quiz + '/ranking').doc(id_user).get();
        }
        catch (err) {
            console.log(err);
        }
        var successRate_point = 0.00;
        if (valueForm !== 0) {
            if (form_rank.data() !== undefined) {
                if (true_quiz > 0 || false_quiz > 0) {
                    let true_point = (parseInt(form_rank.get('true_quiz')) + parseInt(true_quiz));
                    let false_point = (parseInt(form_rank.get('false_quiz')) + parseInt(false_quiz));
                    let total_point = (true_point + false_point);
                    successRate_point = (true_point / total_point) * 100;
                }
                else {
                    successRate_point = parseFloat(form_rank.get('successRate'));
                }
            }
            else {
                if (true_quiz > 0 || false_quiz > 0) {
                    let true_point = parseInt(true_quiz);
                    let false_point = parseInt(false_quiz);
                    let total_point = (true_point + false_point);
                    successRate_point = (true_point / total_point) * 100 || 0.00;
                }
            }
        }
        if (form_rank.data() !== undefined) {
            if (form_rank.get('point') < parseInt(point) && valueForm !== 0) {
                if (true_quiz === 0 && false_quiz === 0) {
                    yield admin.firestore().doc('quizzes/' + id_quiz + '/ranking/' + id_user).update({
                        id_user: id_user,
                        count_form: form_rank.get('count_form') + valueForm,
                    });
                }
                else {
                    yield admin.firestore().doc('quizzes/' + id_quiz + '/ranking/' + id_user).update({
                        successRate: parseFloat(successRate_point.toFixed(2)),
                        id_user: id_user,
                        point: point,
                        datetime: new Date(datetime),
                        count_form: form_rank.get('count_form') + valueForm,
                        true_quiz: form_rank.get('true_quiz') + true_quiz,
                        false_quiz: form_rank.get('false_quiz') + false_quiz,
                    });
                }
            }
            else if (valueForm === 0) {
                yield admin.firestore().doc('quizzes/' + id_quiz + '/ranking/' + id_user).update({
                    name: user_data.name,
                    photoURL: user_data.photoURL,
                });
            }
            else {
                if (form_rank.get('true_quiz') === 0 && form_rank.get('false_quiz') === 0) {
                    yield admin.firestore().doc('quizzes/' + id_quiz + '/ranking/' + id_user).update({
                        successRate: parseFloat(successRate_point.toFixed(2)),
                        point: point,
                        datetime: new Date(datetime),
                        count_form: form_rank.get('count_form') + valueForm,
                        true_quiz: form_rank.get('true_quiz') + true_quiz,
                        false_quiz: form_rank.get('false_quiz') + false_quiz,
                    });
                }
                else {
                    yield admin.firestore().doc('quizzes/' + id_quiz + '/ranking/' + id_user).update({
                        successRate: parseFloat(successRate_point.toFixed(2)),
                        count_form: form_rank.get('count_form') + valueForm,
                        true_quiz: form_rank.get('true_quiz') + true_quiz,
                        false_quiz: form_rank.get('false_quiz') + false_quiz,
                        datetime: new Date(datetime),
                    });
                }
            }
        }
        else {
            yield admin.firestore().collection('quizzes/' + id_quiz + '/ranking/').doc(id_user).set({
                id_user: id_user,
                name: user_data.name,
                photoURL: user_data.photoURL,
                point: point || 0,
                successRate: parseFloat(successRate_point.toFixed(2)),
                datetime: new Date(),
                true_quiz: true_quiz,
                false_quiz: false_quiz,
                count_form: valueForm,
                Time_stamp: new Date(),
                // statusImage:false,
                image_share: null,
            });
        }
    });
}
function debug(conver, value) {
    console.log(conver + " = " + value);
}
exports.getHigthscoreMe = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const id_user = request.query.id_user;
        var res = {};
        try {
            const items = yield getQuizdata();
            const p1 = admin.firestore()
                .collection('quizzes/' + items[0].id + '/ranking')
                .orderBy('point', 'desc')
                .orderBy('successRate', 'desc')
                .orderBy('datetime', 'asc')
                .get()
                .then(data => {
                return data;
            });
            const p2 = admin.firestore()
                .doc('quizzes/' + items[0].id + '/ranking/' + id_user)
                .get()
                .then(data => {
                return data;
            });
            let checkcount = false;
            let count = 0;
            Promise.all([p1, p2])
                .then(arr => {
                arr[0].forEach(doc => {
                    if (checkcount === false) {
                        count++;
                    }
                    if (doc.get('id_user') === id_user) {
                        checkcount = true;
                    }
                });
                const form_user = arr[1].data();
                var rank_data = "0";
                if (checkcount === true) {
                    rank_data = count.toString();
                }
                res = {
                    rank: rank_data,
                    point: form_user.point || 0,
                    form: form_user.count_form || 0,
                    success_rate: form_user.successRate || 0,
                    datetime: form_user.datetime || null,
                    photoURL: form_user.photoURL || null,
                    name: form_user.name || null,
                    true_quiz: form_user.true_quiz || 0,
                    false_quiz: form_user.false_quiz || 0,
                    Time_stamp: form_user.Time_stamp || null,
                    image_share: form_user.image_share || null,
                };
                response.send(res);
            })
                .catch(err => {
                console.log(err);
                response.send(err);
            });
        }
        catch (err) {
            console.log(err);
            response.send(err);
        }
    }));
});
exports.getHigthscore = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const rank = parseInt(request.query.rank);
        var res = [];
        try {
            const items = yield getQuizdata();
            const data = yield admin.firestore()
                .collection('quizzes/' + items[0].id + '/ranking')
                .orderBy('point', 'desc')
                .orderBy('successRate', 'desc')
                .orderBy('datetime', 'asc')
                .limit(rank)
                .get();
            data.forEach(doc => {
                let obj = {
                    id: doc.id || null,
                    point: doc.get('point') || 0,
                    form: doc.get('count_form') || 0,
                    photoURL: doc.get("photoURL") || null,
                    name: doc.get("name") || null,
                    datetime: doc.get('datetime') || null,
                };
                res.push(obj);
            });
            response.send(res);
        }
        catch (err) {
            console.log(err);
            response.send(err);
        }
    }));
});
exports.getScore = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const id_user = request.query.id_user;
        var res = [];
        try {
            const items = yield getQuizdata();
            const data = yield admin.firestore()
                .collection('quizzes/' + items[0].id + '/history_point').orderBy('Time_stamp', 'desc').get();
            data.forEach(doc => {
                if (doc.get('id_user') === id_user) {
                    res.push(doc.data());
                }
            });
        }
        catch (err) {
            console.log(err);
        }
        response.send(res);
    }));
});
function getQuizdataBefore() {
    return __awaiter(this, void 0, void 0, function* () {
        var datetime = new Date();
        const items = [];
        try {
            const data = yield admin.firestore().collection('quizzes').orderBy('Time_End', 'desc').get();
            if (data !== null) {
                data.forEach(doc => {
                    if (doc.get('Time_End') <= datetime) {
                        items.push(Object.assign({ id: doc.id }, doc.data()));
                    }
                });
            }
        }
        catch (err) {
            console.log(err);
        }
        return items;
    });
}
exports.getHigthscoreBefore = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const rank = parseInt(request.query.rank);
        var res = [];
        try {
            const items = yield getQuizdataBefore();
            if (items.length >= 1) {
                const data = yield admin.firestore()
                    .collection('quizzes/' + items[0].id + '/ranking')
                    .orderBy('point', 'desc')
                    .orderBy('successRate', 'desc')
                    .orderBy('datetime', 'asc')
                    .limit(rank)
                    .get();
                data.forEach(doc => {
                    let obj = {
                        id: doc.id || null,
                        point: doc.get('point') || 0,
                        form: doc.get('count_form') || 0,
                        photoURL: doc.get("photoURL") || null,
                        name: doc.get("name") || null,
                        datetime: doc.get('datetime') || null,
                    };
                    res.push(obj);
                });
                response.send(res);
            }
            else {
                response.send(null);
            }
        }
        catch (err) {
            console.log(err);
            response.send(err);
        }
    }));
});
// export const creat_quiz = functions.https.onRequest((request, response) => {
//     cors(request, response, async () => {
//         const form = request.body
//         const key = form.key
//         const questions = form.questions
//         const choice = form.choice
//         var questions_store = []
//         try {
//             if (key === "eiei") {
//                 if (questions.length > 0 && choice.length > 0) {
//                     const data = await admin.firestore().collection('quizzes').orderBy('Time_stamp', 'desc').get()
//                     data.forEach(doc => {
//                         let obj = {
//                             id: doc.id,
//                             ...doc.data()
//                         }
//                         questions_store.push(obj)
//                     })
//                     questions.forEach(async items => {
//                         await admin.firestore().collection('quizzes/' + questions_store[0].id + '/questions').doc().set({
//                             Index: items.Index,
//                             Picture: items.Picture,
//                             Proposition: items.Proposition,
//                             result_true: items.result_true,
//                         })
//                     })
//                     await admin.firestore().doc('quizzes/' + questions_store[0].id).update({
//                         choice: choice
//                     })
//                     response.send("Success")
//                 }
//                 response.send("questions or choice is null")
//             }
//             else {
//                 response.send("key is null")
//             }
//         }
//         catch (err) {
//             console.log(err)
//             response.send(err)
//         }
//     });
// });
exports.scrape = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        try {
            const form = request.body;
            var json_data = JSON.parse(form.data);
            const { link_url, id_quiz, id_user, name_image } = json_data;
            const url = 'https://graph.facebook.com';
            const data = {
                id: link_url,
                scrape: true
            };
            console.log('link_url = ' + link_url);
            console.log('name_image = ' + name_image);
            yield admin.firestore().doc('quizzes/' + id_quiz + '/ranking/' + id_user).update({
                image_share: name_image,
            })
                .then(res => {
                console.log(res);
            });
            yield axios_1.default.post(url, data, { headers: { Authorization: "Bearer 387328961740040|oTvIdcguujqCnKDF1B2N7gb_61U" } })
                .then(res => {
                console.log(res);
            });
            response.send("Success");
        }
        catch (err) {
            console.log(err);
            response.send(err);
        }
    }));
});
//# sourceMappingURL=index.js.map