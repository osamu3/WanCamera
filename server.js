'use strict';

//log4jsを使ったアクセスログの取り方 cf: https://qiita.com/zaburo/items/eaac8df099455f7367f7
//より詳しくは　http://blog.officekoma.co.jp/2019/04/nodejs-express-log4js.html
var log4js = require('log4js');
var initLog4js = require('./subModule/initLog4js');  // ①

initLog4js.log4jsConfigure(log4js);

//logger宣言
var systemLogger = log4js.getLogger();//defauli指定
//var accessLogger = log4js.getLogger('web');
var httpLogger = log4js.getLogger('http');

const express = require("express");
const app = express();
//サーバデブロイ時には、「https」にすると、ワーニングが出なくなる。ローカル接続では、https証明の発行ができいないので、だめ。
const http = require("http").Server(app);
const io = require("socket.io")(http);

var fs = require("fs");
const path = require('path');

//bind http log httpロガーをバインド
app.use(log4js.connectLogger(httpLogger));

// cssやjavascriptやイメージ等の静的ファイルを利用するためのおまじない。//////////////////////
//http://expressjs.com/ja/starter/static-files.htmlより
//express.staticミドルウエア へ静的アセットファイルを格納しているディレクトリを渡す。
app.use(express.static(path.join(__dirname, 'public')));   //←でパス文字無しで"public"に格納されている静的ファイルを利用できる。
//※↑た express.static 関数に指定するパスは、node 起動ディレクトリーからの相対パスであるから、絶対パスで定義する方が安全

// (クライアント側設定)View EngineにEJSを指定。
app.set('view engine', 'ejs');

// "/"へのGETリクエストで/views/index.ejsを表示する。拡張子（.ejs）は省略されていることに注意。
app.get("/", function (req, res, next) {
    res.render("index", {});
});

// "/imgUplodForm"へのGETリクエストで/views/imgUpLoadForm.ejsを表示する。拡張子（.ejs）は省略されていることに注意。
app.get("/imgUploadForm", function (req, res, next) {
    res.render("imgUploadForm", {});
});

//listen()メソッドを実行してポートで待ち受け。
//var port = process.env.PORT || 1337;
const port = 8080;

http.listen(port, () => {
    console.log(`listening on *:${port}`);
});

//system log
systemLogger.info("Express start");//開始した旨のログ吐き出し

//IOソケットイベント
io.sockets.on('connection', function (socket) {
    var AllEvntData = {};//サーバーに保存してある全てのイベントデータ
    //socket Emit send Event All Data.
    console.log('=== クライアントの接続がありました。==');
    console.log(JSON.stringify(socket.handshake));

    //////////////////////////////////////////////////////////////
    //クライアントから全てのイベントファイルデータの送信要求があった。。
    /////////////////////////////////////////////////////////////
    socket.on('C2S:sendRequestEventFilesData', function () {
        //イベントデータファイル一覧を配列に入れて、ソケットでクライアントへ送信。
        let flist;
        //ファイル一覧取得
        flist = fs.readdirSync('./public/eventData2');
        for (let fnm of flist) {
            if (fnm.match(/.json$/)) {//JSONファイルなら
                AllEvntData[fnm] =
                    //AllEvntData.push(//ファイルの読み込み。読み込んだファイルはJSON文字列
                    fs.readFileSync('./public/eventData2/' + fnm, 'utf8',
                        function (err, jsnDt) {
                            if (err) { throw err; }
                            //return JSON.parse(jsnDt);//読み込まれた「jsnDt」はJSON文字列なので、配列に変換してリターンする。
                            return jsnDt;
                        }
                    );
            }
        }
        socket.emit("S2C:sendAllEventData", AllEvntData);//どうも配列としてsocket送信する訳だが、送信時に文字列(JSON)に変換されるようだ。
    });

    //孫クライアントから全てのイベントファイルデータの送信要求があった。。
    socket.on('CC2S:sendRequestEventFilesData', function () {
        if (AllEvntData != null)
            socket.emit("S2CC:sendAllEventData", AllEvntData);//配列が、送信時に文字列(JSON)に変換されるようだ。
    });

    //イベントデータのイニシャル登録（仮登録）があった。
    socket.on('C2S:postEventInitData', function (receiveDt) {
        console.log('=== イベントデータのイニシャル登録（仮登録）があった。==');
        console.log('=== ファイル名は：' + receiveDt.uniqueFileNm);
        console.log('=== 緯度・経度は：' + receiveDt.latLng);
        console.log('=== イベントタイプは：' + receiveDt.eventType);
        console.log('=== イベントタイプIDは：' + receiveDt.eventTypeId);
        console.log('=== 年は：' + receiveDt.year);
        console.log('=== 月は：' + receiveDt.month);
        console.log('=== 日は：' + receiveDt.day);
        console.log('=== 時は：' + receiveDt.hour);
        console.log('=== 分は：' + receiveDt.minute);
        console.log('=== 場所は：' + receiveDt.place);
        console.log('=== KPは：' + receiveDt.kp);
        console.log('=== 概要は：' + receiveDt.sammary);
        console.log('=== 完了フラグは：' + receiveDt.completedFlg);

        const fileUniqueName = "./public/eventData2/" + receiveDt.uniqueFileNm;
        console.log('=== 登録パスは：' + fileUniqueName);

        //ファイル保存　ファイルがなければ新規、あれば上書き
        fs.writeFile(fileUniqueName, JSON.stringify(receiveDt), function (err) {
            if (err) { throw err; }
            console.log("アップロード完了");
        });
    });
});
