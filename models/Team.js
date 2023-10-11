const { response } = require("express");
const mysql = require("../config/mysql");

module.exports = {

    getNotifAndTeamInfo: function (user_id, callback) {
        if (user_id == undefined) {
            callback("0");
        } else {
            const querystring = `
            SELECT N.*, T.*
            FROM Notification AS N
            RIGHT JOIN Team AS T 
            ON N.receive_userid = T.user_id
            WHERE T.user_id = ${user_id}
            `;
            mysql.query(querystring, function (error, result) {
                if (error) throw error;
                callback(result);  // 결과가 없을 경우 null이 반환됩니다.
            });
        }
    },

    //Team 전체 조회
    getAllTeam: function (callback) {
        const querystring = `Select * from Team;`;
        mysql.query(querystring, function (error, result) {
            if (error) throw error;
            callback(result);
        })
    },

    //Team 전체 조회
    getQueryTeam: function (idArray, callback) {

        var addQuery = ' WHERE ';
        idArray.forEach((id, idx) => {
            addQuery += ' user_id = '
            addQuery += id;
            if (idx != idArray.length - 1)
                addQuery += ' OR '
        });

        const querystring = `Select * from Team ${addQuery};`;
        mysql.query(querystring, function (error, result) {
            if (error) throw error;
            callback(result);
        })
    },

    //user_id로 단일 TEam 조회
    getOneTeam: function (user_id, callback) {
        if (user_id == null) {
            callback(null);
        } else {
            const querystring = `SELECT * FROM Team WHERE user_id= ${user_id} limit 1;`;
            mysql.query(querystring, function (error, result) {
                if (error) throw error;
                if (result.length) {
                    callback(result[0]);
                } else {
                    // 결과가 없을 시 
                    callback(null);
                }
            })
        }
    },

    getOneTeamNocallback: function (user_id) {
        return new Promise((resolve, reject) => {
            if (user_id == null) {
                resolve(null);
            } else {
                const querystring = `SELECT * FROM Team WHERE user_id= ${user_id} limit 1;`;
                mysql.query(querystring, function (error, result) {
                    if (error) throw error;
                    if (result.length) {
                        resolve(result[0]);
                    } else {
                        // 결과가 없을 시 
                        resolve(null);
                    }
                })
            }
        })
    },

    getTwoTeam: function (user_id1, user_id2, callback) {
        const querystring = `SELECT * FROM Team Where user_id = ${user_id1} or user_id = ${user_id2} LIMIT 0,100;`;
        mysql.query(querystring, function (error, result) {
            if (error) throw error;
            if (result.length) {
                callback(result);
            } else {
                // 결과가 없을 시 
                callback(null);
            }
        })
    },

    teamWinLose: function (winnerId, loserId, callback) {
        const querystring = `
        SELECT
            'winner' AS userType,
            win_score AS win_score
        FROM Team
        WHERE user_id = ${winnerId}
        UNION ALL
        SELECT
            'loser' AS userType,
            win_score AS win_score
        FROM Team
        WHERE user_id = ${loserId};`;
        mysql.query(querystring, function (error, result) {
            if (error) throw error;
            if (result.length) {
                callback(result);
            } else {
                // 결과가 없을 시 
                callback(null);
            }
        })
    },

    TeamAndMatchForSMS: function (match_id, callback) {
        const querystring = `
        SELECT m.match_id, 
        t1.user_id as home_userid, 
        t1.hp as home_hp, 
        t1.teamname as home_teamname, 
        t2.user_id as away_userid, 
        t2.hp as away_hp,
        t2.teamname as away_teamname
        FROM Matches m
        JOIN Team t1 ON m.home_userid = t1.user_id
        JOIN Team t2 ON m.away_userid = t2.user_id
        WHERE m.match_id = ${match_id}
        LIMIT 1;
        `;
        mysql.query(querystring, function (error, result) {
            if (error) throw error;
            if (result.length) {
                callback(result[0]);
            } else {
                // 결과가 없을 시 
                callback(null);
            }
        })
    },

    //id password로 단일 TEam 조회 (로그인)
    getLoginTeam: function (id, password, callback) {
        const querystring = `SELECT * FROM Team Where id= ? and password = ?;`;
        mysql.query(querystring,[id,password] ,function (error, result) {
            if (error) throw error;
            if (result.length) {
                callback(result[0]);
            }
            // 결과가 없을 시 
            else {
                callback(null);
            }
        })
    },

    //Team에 팀 삽입
    insertTeam: function (id, password, teamname, represent_name, hp, callback) {
        const querystring = `INSERT INTO Team ( id, password, teamname, represent_name, hp) VALUES ( '${id}', '${password}', '${teamname}', '${represent_name}','${hp}');`;
        mysql.query(querystring, (err, rows) => {
            if (err) throw err;
            console.log(rows);
            callback(rows.insertId);
        });
    },

    //팀 정보 수정
    updateTeam: function (data, user_id, callback) {

        var querystring = `UPDATE Team SET id='${data.id}', password='${data.password}', teamname='${data.teamname}', represent_name='${data.represent_name}', hp='${data.hp}', logo_image='${data.logo_image}' WHERE user_id=${user_id}`;
        mysql.query(querystring, (err, rows) => {
            if (err) throw err;
            console.log(rows);

            callback(rows);
        })
    },

    //팀 정보 삭제
    DeleteTeam: function (id, callback) {
        mysql.query(`DELETE FROM Team WHERE user_id=${id}`, (err, rows) => {
            if (err) throw err;
            console.log(rows);

            callback(rows);
        })
    },

    updateResult: function (data, callback) {

        var querystring = `UPDATE Team
        SET win_score = CASE
            WHEN user_id = ${data.winnerId} THEN ${data.winnerScore}
            WHEN user_id = ${data.loserId} THEN ${data.loserScore}
            ELSE win_score
        END,
        win = CASE
            WHEN user_id = ${data.winnerId} THEN win + 1
            ELSE win
        END,
        lose = CASE
            WHEN user_id = ${data.loserId} THEN lose + 1
            ELSE lose
        END,
        totalMatches = totalMatches + 1
        WHERE user_id IN (${data.winnerId}, ${data.loserId});`;
        mysql.query(querystring, (err, rows) => {
            if (err) throw err;
            console.log(rows);

            callback(rows);
        })
    },

    updateDraw: function (data, callback) {

        var querystring = `UPDATE Team
        SET win_score = CASE
            WHEN user_id = ${data.winnerId} THEN ${data.winnerScore}
            WHEN user_id = ${data.loserId} THEN ${data.loserScore}
            ELSE win_score
        END,
        draw = draw + 1,
        totalMatches = totalMatches + 1
        WHERE user_id IN (${data.winnerId}, ${data.loserId});`;
        mysql.query(querystring, (err, rows) => {
            if (err) throw err;

            callback(rows);
        })
    },

    updateManner: function (query, user_id, callback) {

        var querystring = `UPDATE Team SET ` + query + `WHERE user_id=${user_id}`;
        mysql.query(querystring, (err, rows) => {
            if (err) throw err;

            callback(rows);
        })
    },


    //login_demo - insert Team 테스트 코드
    insertTeamtest: function (id, password, callback) {
        const querystring = `INSERT INTO Team (id, password) VALUES ('${id}', '${password}');`;
        mysql.query(querystring, function (err, rows) {
            if (err) console.log("errorrr");
            //console.log(rows);
            callback(rows.insertId);
        });
    }



}
