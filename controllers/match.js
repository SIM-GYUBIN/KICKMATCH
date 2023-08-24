const path = require("path");
const team = require("../models/Team")
const match = require("../models/Match");
const notif = require("../models/Notification");
const findMatch = require("../modules/findMatch");
//const { match } = require("assert");
const jwt = require('jsonwebtoken');
const { create } = require("domain");
const secretKey = require('../config/secretkey').secretKey;
const options = require('../config/secretkey').options;
require('dotenv').config();

module.exports = {

    match_making : (req, res) => {
        
        var match_place = req.body.district;       
        var gameDate = req.body.gameDate;
        var gameTime = req.body.gameTime;

        //매치메이킹 정보와 신청자의 정보 조합
        team.getOneTeam(req.user_id , (user)=>{
            var info = {
                user_id: req.user_id,
                win_score : user.win_score,
                manner_score : user.manner_score,
                place:match_place,
                date:gameDate,
                time:gameTime
            };

        findMatch.findMatch(info, (matchData, matchAvailability)=>{
            //results : 경기 가능 팀들의 {id,가능장소,겹치는시간}
            //matchAvailability : 경기할 팀 여부 true: 있음, false: 없음

            //매치가 없는 경우
            //등록하려던 정보 담아 토큰으로 넘김
            if (matchAvailability==false) {
                //payload = JSON.parse(JSON.stringify(info));
                payload = JSON.stringify(info);
                token = jwt.sign(payload,secretKey,options);
                res.cookie('myMatchtoken',token);

                res.redirect('/matching/noMatch');
                console.log("매치없음 at findmatch at match.js");

            //매치가 있는 경우
            //찾은 매치 정보들 담아 토큰으로 넘김 (수정 필요!! 토큰 크기 과다)
            } else if (matchAvailability==true) {
                //payload = JSON.parse(JSON.stringify(matchData));
                // console.log(matchData);
                payload = JSON.stringify(matchData);
                token = jwt.sign(payload,secretKey,options);
                res.cookie('findMatchestoken',token);
                res.redirect('/matching/matched');
                console.log("매치있음 at findmatch at match.js");
            }
        });
    })
    },

    insertMatch : (req,res) => {
        var home_userid = req.user_id;
        var match_date = req.myMatch.date;
        var match_place = req.myMatch.place;
        var match_time = req.myMatch.time;

        var stadium = req.body.stadium;
        var nx = req.body.nx;
        var ny = req.body.ny;

        const now = new Date(); // 현재 시간
        const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); // 현재 시간을 utc로 변환한 밀리세컨드값
        const koreaTimeDiff = 9 * 60 * 60 * 1000; // 한국 시간은 UTC보다 9시간 빠름(9시간의 밀리세컨드 표현)
        const koreaNow = new Date(utcNow + koreaTimeDiff); // utc로 변환된 값을 한국 시간으로 변환시키기 위해 9시간(밀리세컨드)를 더함
        const created = koreaNow.toISOString().replace('T', ' ').substr(0, 19);

        match.insertMatch(home_userid, match_date, match_place, match_time, created, stadium, nx, ny, function (result) {
            res.redirect('/game/registered-match');
        });
    },

    match_request : (req,res) => {

        // {
        //   home_userid: '2',
        //   match_id: '16',
        //   match_date: '2023-05-18',
        //   match_place: '강동구,강북구',
        //   match_time: '12:14',
        //   teamname: 'FC강동'
        // }
        match_id = req.body.match_id;
        request_userid = req.user_id; //cookie에서 로그인 사용자
        receive_userid = req.body.home_userid;
        request_teamname = req.body.teamname;
        match_date = req.body.match_date
        match_time = req.body.match_time
        match_place = req.body.match_place //얘 하나일 때 배열로 넣기?
        

        //notif 테이블에다가 match_date부터 match_place, overlap_start도 넣어서 
        console.log(req.body)
        team.getOneTeam(request_userid, function (result) {
            request_teamname = result.teamname;
            notif.insertNotification(match_id, receive_userid, request_userid, request_teamname,"요청",match_date, match_time, match_place, function (notiID) {
                res.redirect('/');
            });
        });
    },

    cancel_match : (req, res) => {
        //로그인 사용자와 검증필요? 혹은 이중검증?

        match.DeleteMatch(req.body.match_id , function(result) {
            console.log('at cancel_match : '+ result)
            res.redirect('/');
        })
    },

    match_accept: (req, res) => {
        //여기서 할 일 
        //noti 알림 삭제
        //matchtable away_userid에 id넣기
        //matchtime 넣기
        //matchplace 바꾸기

        // {
        //   notif_id: '6',
        //  date: ~,
        //   match_id: '97',
        //   RQuserid: '15',
        //   RQstart: '13:00',
        //   RQplace: '강남구'
        // }
        const data = req.body;

        notif.DeleteNotification_matchid(data.match_id, function (result) {
            match.updateMatch_accept(data, function (result) {
                team.getOneTeam(req.user_id, function (result) {
                    request_teamname = result.teamname;
                    notif.insertNotification(data.match_id, data.RQuserid, req.user_id, request_teamname,"수락", data.date , data.time, data.place , function (notiID) {
                        res.redirect('/');
                    });
                });
            });
        })
    },

    match_reject : (req,res) => {
        //여기서 할 일 
        //noti 알림 삭제
    
    // [
    // {
    //  notif_id: 10,
    //  match_id: 16,
    //  date: '2023-05-18',
    //  RQuserid : 1,
    //  RQteamname: 'FC도봉',
    //  RQplace: '강동구',
    //  RQstart: '16:14',
    //  OGplace: '강동구,강북구',
    //  OGstart: '12:14:00',
    //  OGend: '16:16:00'
    // }
    // ]

        notif.DeleteNotification(req.body.notif_id, function () {
            res.redirect('/game/requested-match');
        });
    },

}