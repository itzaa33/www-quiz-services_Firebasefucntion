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
const storage_1 = require("@google-cloud/storage");
const gcs = new storage_1.Storage();
const os_1 = require("os");
const path_1 = require("path");
const cpp = require("child-process-promise");
const spawn = cpp.spawn;
const child_process = require("child_process");
const exec = child_process.exec;
const cors = require('cors')({
    origin: true
});
exports.ResizingImages = functions.storage.object().onFinalize((object) => __awaiter(this, void 0, void 0, function* () {
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    const metageneration = object.metageneration;
    const checkPath = filePath.split('/');
    if (checkPath[1] === 'image_quiz') {
        // Exit if this is triggered on a file that is not an image.
        if (!contentType.startsWith('image/')) {
            console.log('This is not an image.');
            return null;
        }
        // Get the file name.
        const fileName = path_1.basename(filePath);
        // Exit if the image is already a thumbnail.
        if (fileName.startsWith('Resize-')) {
            console.log('Already a Thumbnail.');
            return null;
        }
        const bucket = gcs.bucket(fileBucket);
        const tempFilePath = path_1.join(os_1.tmpdir(), path_1.basename(fileName));
        const metadata = {
            contentType: contentType,
        };
        return bucket.file(filePath).download({
            destination: tempFilePath,
        })
            .then(() => {
            console.log('Image downloaded locally to', tempFilePath);
            // Generate a thumbnail using ImageMagick.
            return spawn('convert', [tempFilePath, '-thumbnail', '600x400>', tempFilePath]); //จะเปลี่ยนเป็น 600*600
        })
            .then(() => {
            console.log('Thumbnail created at', tempFilePath);
            // We add a 'thumb_' prefix to thumbnails file name. That's where we'll upload the thumbnail.
            const thumbFileName = `Resize-${fileName}`;
            const thumbFilePath = path_1.join(path_1.dirname(filePath), thumbFileName);
            // Uploading the thumbnail.
            // return bucket.upload( tempFilePath, {
            //     destination: thumbFilePath,
            //     metadata: metadata,
            // })
            return bucket.upload(tempFilePath, {
                destination: thumbFilePath,
                metadata: {
                    contentType: 'image/png',
                    metadata: {
                        firebaseStorageDownloadTokens: 'mazsaquiz'
                    }
                }
            })
                .then((data) => {
                let file = data[0];
                return Promise.resolve("https://firebasestorage.googleapis.com/v0/b/" + bucket.name + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=mazsaquiz");
            });
            // Once the thumbnail has been uploaded delete the local file to free up disk space.
        }).then(() => {
            return bucket.file(filePath).delete().then(() => {
                console.log('uploaded delete the local file');
            })
                .catch(err => {
                console.log(err);
            });
        });
    }
    else {
        console.log('No resize image file');
        return null;
    }
}));
// export const DeleteImage = functions.https.onRequest((request, response) => {
//     cors(request, response, async () => {
//         const path = request.query.path
//         // const bucket = gcs.bucket( functions.config().firebase.storageBucket )
//         // const bucket = gcs.bucket( "/eiei/kiki" )
//         exec("gsutil rm -r gs://mazsa-quiz.appspot.com/eiei/kiki/*" , function(error,stdout,stderr){
//             console.log('Success')
//             response.send('Success')
//         });
//         // bucket.getFiles(function(err, files) {
//         //     files.forEach(function(file) {
//         //       file.delete();
//         //     });
//         //   });
//         // exec("gsutil rm gs://mazsa-quiz.appspot.com/"+path+"/*" , function(error,stdout,stderr){
//         //     console.log('Success')
//         //     response.send('Success')
//         // });
//     })
// })
exports.checkUser = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const token = request.query.token;
        if (token === 'TVrePnuHVEQgPhWLekgFqGWm5Ja2') {
            response.send(true);
        }
        else {
            response.send(false);
        }
    }));
});
exports.DeleteQuiz = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        try {
            const title = request.query.title;
            const data = yield admin.firestore().collection('quizzes').where("title", "==", title).get();
            for (let i = 0; i < data.docs.length; i++) {
                const element = data.docs[i];
                const snapshot = yield admin.firestore().collection('quizzes/' + element.id + '/questions').get();
                const batch = admin.firestore().batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                yield batch.commit();
                yield admin.firestore().collection('quizzes').doc(element.id).delete();
            }
            // data.forEach(async element => {
            //     const snapshot = await admin.firestore().collection('quizzes/'+element.id+'/questions').get()
            //     const batch = admin.firestore().batch()
            //     snapshot.docs.forEach(doc => batch.delete(doc.ref))
            //     await batch.commit()
            //     await admin.firestore().collection('quizzes').doc(element.id).delete()
            // });
            response.send('Success');
        }
        catch (err) {
            response.send(err);
        }
    }));
});
exports.getQuizsAll = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        try {
            const items = [];
            const data = yield admin.firestore().collection('quizzes').get();
            data.forEach(doc => {
                items.push(Object.assign({ id: doc.id }, doc.data()));
            });
            response.send(items);
        }
        catch (err) {
            console.log(err);
            response.send(null);
        }
    }));
});
exports.createDescriptionQuiz = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        try {
            const form = request.body;
            console.log(form);
            if (form.key === "eiei") {
                yield admin.firestore().collection('quizzes').doc().set({
                    Time_End: new Date(form.End_time),
                    Time_Start: new Date(form.Start_time),
                    title: form.title,
                    Rewards: form.Rewards,
                    Time_stamp: new Date(),
                });
                response.send('Success');
            }
            else {
                response.send('Error');
            }
        }
        catch (err) {
            response.send(err);
        }
    }));
});
exports.create_quiz = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const form = request.body;
        const key = form.key;
        const questions = form.questions;
        const choice = form.choice;
        var questions_store = [];
        try {
            if (key === "eiei") {
                if (questions.length > 0 && choice.length > 0) {
                    const data = yield admin.firestore().collection('quizzes').orderBy('Time_stamp', 'desc').get();
                    data.forEach(doc => {
                        let obj = Object.assign({ id: doc.id }, doc.data());
                        questions_store.push(obj);
                    });
                    questions.forEach((items) => __awaiter(this, void 0, void 0, function* () {
                        yield admin.firestore().collection('quizzes/' + questions_store[0].id + '/questions').doc().set({
                            Index: items.Index,
                            Picture: items.Picture,
                            Proposition: items.Proposition,
                            result_true: items.result_true,
                        });
                    }));
                    yield admin.firestore().doc('quizzes/' + questions_store[0].id).update({
                        choice: choice
                    });
                    response.send("Success");
                }
                else {
                    response.send("questions or choice is null");
                }
            }
            else {
                response.send("key is null");
            }
        }
        catch (err) {
            console.log(err);
            response.send(err);
        }
    }));
});
exports.create_Admin = functions.https.onRequest((request, response) => {
    cors(request, response, () => __awaiter(this, void 0, void 0, function* () {
        const form = request.body;
        const key = form.key;
        const uid = form.uid;
        if (key == 'eiei') {
            // Set admin privilege on the user corresponding to uid.
            yield admin.auth().setCustomUserClaims(uid, { admin: true }).then(() => {
                console.log('add claims OK');
                response.send("add claims OK");
            })
                .catch(err => {
                console.log(err);
                response.send(err);
            });
        }
        else {
            response.send("key is null");
        }
    }));
});
//# sourceMappingURL=Admin.js.map