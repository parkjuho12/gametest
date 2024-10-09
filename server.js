const express = require('express');
const mysql = require('mysql');
const path  = require('path');
const fs =  require('fs');
const db = require('./db/db.json');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcrypt');


const pool = mysql.createPool({
    connectionLimit: 10,
    host: db.host,
    port: 3306,
    user: db.user,
    password: db.password,
    database: db.database,
    debug: false
});

const app = express();
const port = 3000;
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); // 파일 저장 경로
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // 파일 이름 설정
    }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(session({
    secret: 'qkrwngh2350', // 비밀 키를 사용하여 세션을 암호화합니다.
    resave: false,
    saveUninitialized: true
}));

app.post('/process/adduser', (req, res) => {
    const paramEmail = req.body.email;
    const paramId = req.body.id;
    const paramPassword = req.body.password;
    const paramName = req.body.name;
    const paramAge = req.body.age;

    pool.getConnection((err, conn) => {
        if (err) {
            console.log('MySQL getConnection 오류 발생, 연결 종료');
            return res.redirect('/public/auth/adduser.html?error=회원가입 실패'); // 에러 메시지 쿼리 파라미터 추가
                }

        // 비밀번호 해싱
        bcrypt.hash(paramPassword, 10, (err, hash) => {
            if (err) {
                console.error('비밀번호 해싱 오류 발생:', err);
                conn.release(); // 연결 해제
                return res.redirect('/public/auth/adduser.html'); // 실패 시 리디렉션
            }

            conn.query(
                'INSERT INTO user (이메일, 아이디, 비밀번호, 이름, 나이) VALUES (?,?, ?, ?, ?)',
                [paramEmail, paramId, hash, paramName, paramAge], // 해시된 비밀번호 저장
                (err, result) => {
                    conn.release(); // 연결 해제

                    if (err) {
                        console.log('SQL 실행 오류 발생');
                        console.error(err);
                        return res.redirect('/public/auth/adduser.html'); // 실패 시 리디렉션
                    }

                    console.log('회원가입 성공');
                    res.redirect('/public/auth/login.html');
                }
            );
        });
    });
});

app.post('/process/login', (req, res) => {
    const paramId = req.body.id;
    const paramPassword = req.body.password;

    pool.getConnection((err, conn) => {
        if (err) {
            console.log('SQL 실행 오류 발생');
            console.error(err);
            return res.status(500).send('<h1>로그인 실패</h1>');
        }

        conn.query(
            'SELECT 아이디, 비밀번호, 이름, profile_image FROM user WHERE 아이디 = ?',
            [paramId],
            (err, rows) => {
                conn.release(); // 항상 연결을 종료

                if (err) {
                    console.log('SQL 실행 오류 발생');
                    console.error(err);
                    return res.status(500).send('<h1>로그인 실패</h1>');
                }

                if (rows.length > 0) {
                    const user = rows[0];

                    // 비밀번호 확인
                    bcrypt.compare(paramPassword, user.비밀번호, (err, isMatch) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('<h1>로그인 실패</h1>');
                        }

                        if (isMatch) {
                            // 사용자 로그인 성공
                            req.session.user = { ...user, isAdmin: false };
                            console.log('로그인 성공, 사용자 정보:', user);
                            return res.redirect(`/public/home.html?id=${user.아이디}&name=${user.이름}&image=${user.profile_image}`);
                        } else {
                            // 비밀번호 불일치
                            console.log('아이디 [%s], 비밀번호 불일치', paramId);
                            return res.status(200).send('<h2>로그인 실패, 아이디와 비밀번호를 확인하세요</h2>');
                        }
                    });
                } else {
                    // 사용자 없음
                    console.log('아이디 [%s]가 존재하지 않음', paramId);
                    return res.status(200).send('<h2>로그인 실패, 아이디와 비밀번호를 확인하세요</h2>');
                }
            }
        );
    });
});


app.get('/process/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.log('로그아웃 실패');
                res.status(500).send('<h1>로그아웃 실패</h1>');
                return;
            }
            res.redirect('/public/index.html'); // 로그아웃 후 index.html로 리다이렉트
        });
    } else {
        res.redirect('/public/index.html'); // 세션이 없는 경우에도 리다이렉트
    }
});

app.get('/api/getUserInfo', (req, res) => {
    if (req.session.user) {
        const userId = req.session.user.아이디;
        pool.getConnection((err, conn) => {
            if (err) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const query = 'SELECT 아이디, 이름 FROM user WHERE 아이디 = ?';
            const params = [userId];

            conn.query(query, params, (err, rows) => {
                conn.release();

                if (err) {
                    console.error('SQL 실행 오류 발생:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                if (rows.length > 0) {
                    const user = rows[0];
                    res.json({
                        id: user.아이디,
                        name: user.이름,
                        profileImage: '/path/to/default/image.jpg' // 기본 이미지 경로
                    });
                } else {
                    res.status(404).json({ error: 'User not found' });
                }
            });
        });
    } else {
        // 로그인 안 된 경우 JSON 응답
        res.status(401).json({ error: 'Unauthorized' });
    }
});

app.post('/api/getMaxPage', (req, res) => {
    pool.getConnection((err, conn) => {
        if (err) {
            console.error('MySQL 연결 오류', err);
            res.status(500).send({ error: 'DB 연결 실패' });
            return;
        }

        conn.query('SELECT COUNT(*) AS count FROM community', (err, results) => {
            conn.release();

            if (err) {
                console.error('SQL 쿼리 오류', err);
                res.status(500).send({ error: '쿼리 실패' });
                return;
            }

            res.send({ max: results[0].count });
        });
    });
});

// 특정 페이지의 게시물 데이터를 가져오는 API
app.post('/api/getPageData', (req, res) => {
    const { min, max } = req.body;

    pool.getConnection((err, conn) => {
        if (err) {
            console.error('MySQL 연결 오류', err);
            res.status(500).send({ error: 'DB 연결 실패' });
            return;
        }

        conn.query('SELECT board_id, 아이디, title, upload_date FROM community ORDER BY upload_date DESC LIMIT ?, ?', [min - 1, max - min + 1], (err, results) => {
            conn.release();

            if (err) {
                console.error('SQL 쿼리 오류', err);
                res.status(500).send({ error: '쿼리 실패' });
                return;
            }

            res.send({ DB: results });
        });
    });
});

// 새 게시물 작성 API
app.post('/api/writePost', (req, res) => {
    const { title, content } = req.body;
    const userId = req.session.user ? req.session.user.아이디 : null;

    if (!userId) {
        return res.status(401).send({ error: '로그인 필요' });
    }

    pool.getConnection((err, conn) => {
        if (err) {
            console.error('MySQL 연결 오류', err);
            res.status(500).send({ error: 'DB 연결 실패' });
            return;
        }

        conn.query(
            'INSERT INTO community (title, content, 아이디, upload_date) VALUES (?, ?, ?, NOW())',
            [title, content, userId],
            (err, results) => {
                conn.release();

                if (err) {
                    console.error('SQL 쿼리 오류', err);
                    res.status(500).send({ error: '쿼리 실패' });
                    return;
                }

                res.send({ success: true });
            }
        );
    });
});

// 게시물 상세 정보 가져오기
app.get('/api/getPost/:board_id', (req, res) => {
    const boardId = req.params.board_id;

    pool.getConnection((err, conn) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        conn.query(
            'SELECT board_id, 아이디, title, content, upload_date FROM community WHERE board_id = ?',
            [boardId],
            (err, rows) => {
                conn.release();

                if (err) {
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                if (rows.length > 0) {
                    res.json(rows[0]);
                } else {
                    res.status(404).json({ error: 'Post not found' });
                }
            }
        );
    });
});

// 댓글 목록 가져오기
app.get('/api/getComments/:board_id', (req, res) => {
    const boardId = req.params.board_id;

    pool.getConnection((err, conn) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        conn.query(
            'SELECT comment_id, 아이디, content FROM comment WHERE board_id = ?',
            [boardId],
            (err, rows) => {
                conn.release();

                if (err) {
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                res.json(rows);
            }
        );
    });
});

// 댓글 작성하기
app.post('/api/writeComment', (req, res) => {
    const { content, board_id, 아이디 } = req.body;

    pool.getConnection((err, conn) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        conn.query(
            'INSERT INTO comment (아이디, board_id, content) VALUES (?, ?, ?)',
            [아이디, board_id, content],
            (err, result) => {
                conn.release();

                if (err) {
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                res.json({ success: true });
            }
        );
    });
});



app.listen(port, () => {
    console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});