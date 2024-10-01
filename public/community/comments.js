fetch('/api/getUserInfo')
.then(response => response.json())
.then(data => {
    document.getElementById('userId').innerText = 'ID: ' + data.id;
    window.userId = data.id; // 사용자 ID를 전역 변수로 설정
})
.catch(error => {
    console.error('에러 발생:', error);
    document.getElementById('userId').innerText = 'ID: 로그인 필요';
});

// DOMContentLoaded 이벤트 리스너
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("board_id"); // 게시물 ID를 가져옵니다.

    // 게시물 세부 정보 가져오기
    try {
        const postResponse = await fetch(`/api/getPost/${postId}`);
        const postData = await postResponse.json();
        document.getElementById("postTitle").innerText = postData.title; // 제목 표시
        document.getElementById("postContent").innerText = postData.content; // 내용 표시
    } catch (error) {
        console.error("게시물 정보 가져오기 오류:", error);
    }

    // 댓글 목록 가져오기
    try {
        const commentsResponse = await fetch(`/api/getComments/${postId}`);
        const commentsData = await commentsResponse.json();
        
        const commentsList = document.getElementById("commentsList");
        commentsData.forEach(comment => {
            const li = document.createElement("li");
            li.innerText = `${comment.아이디}: ${comment.content}`; // 댓글 내용과 작성자 표시
            commentsList.appendChild(li);
        });
    } catch (error) {
        console.error("댓글 목록 가져오기 오류:", error);
    }

    // 댓글 작성 폼 제출 처리
    document.getElementById("commentForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const commentContent = document.getElementById("commentContent").value;

        if (!window.userId) {
            alert("로그인 후 댓글을 작성하세요.");
            return;
        }

        try {
            const response = await fetch("/api/writeComment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    board_id: postId,
                    아이디: window.userId, // 로그인된 사용자 ID 사용
                    content: commentContent,
                }),
            });

            const result = await response.json();
            if (result.success) {
                window.location.reload(); // 새 댓글을 보기 위해 페이지 새로고침
            } else {
                alert("댓글 작성에 실패했습니다.");
            }
        } catch (error) {
            console.error("댓글 작성 오류:", error);
            alert("댓글 작성 중 오류가 발생했습니다.");
        }
    });
});
