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
        res.status(401).json({ error: 'Unauthorized' });
    }
});
