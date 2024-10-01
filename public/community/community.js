fetch('/api/getUserInfo')
.then(response => response.json())
.then(data => {
    document.getElementById('userId').innerText = 'ID: ' + data.id;
})
.catch(error => {
    console.error('에러 발생:', error);
    document.getElementById('userId').innerText = 'ID: 로그인 필요';
    document.getElementById('userName').innerText = 'Name: 로그인 필요';
});
document.addEventListener("DOMContentLoaded", async () => {
    let result = "<tr><th>제목</th><th>작성자</th><th>업로드 날짜</th></tr>";

    try {
        // 사용자 정보 가져오기
        const userResponse = await fetch("/api/getUserInfo");
        const userData = await userResponse.json();
        
        // 사용자 ID를 전역 변수로 설정
        window.userId = userData.id;


        // 페이지에 게시물 데이터 로드
        const page_len = 10; // 한 페이지당 게시물 길이
        const urlParams = new URLSearchParams(window.location.search);
        let page_num = parseInt(urlParams.get("page_num") || "1", 10);

        const lenResponse = await fetch("http://localhost:3000/api/getMaxPage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });
        const lenData = await lenResponse.json();
        const max = lenData.max;

        page_num = Math.max(1, Math.min(page_num, Math.ceil(max / page_len))); // 페이지 번호 조정

        const min = (page_num - 1) * page_len + 1;
        const maxVal = page_num * page_len;

        const response = await fetch("http://localhost:3000/api/getPageData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ min: min, max: maxVal })
        });

        const data = await response.json();
        data.DB.forEach(element => {
            result += `<tr><td><a href="board.html?board_id=${element.board_id}">${element.title}</a></td><td>${element.authorName || element.아이디}</td><td>${element.upload_date}</td></tr>`;
        });

        document.getElementById("table").innerHTML = result;

        // 페이지네이션 링크 생성
        if (page_num > 1) {
            document.getElementById("footer").innerHTML += `<a href="?page_num=${page_num - 1}">&lt;</a> `;
        }
        for (let i = 1; i <= Math.ceil(max / page_len); i++) {
            if (i === page_num) {
                document.getElementById("footer").innerHTML += `<strong>${i}</strong> `;
            } else {
                document.getElementById("footer").innerHTML += `<a href="?page_num=${i}">${i}</a> `;
            }
        }
        if (page_num < Math.ceil(max / page_len)) {
            document.getElementById("footer").innerHTML += `<a href="?page_num=${page_num + 1}">&gt;</a>`;
        }
    } catch (error) {
        console.error('데이터 가져오기 오류:', error);
    }
});

// 글 작성 폼 제출 처리
// 글 작성 폼 제출 처리
document.getElementById("postForm").addEventListener("submit", async (e) => {
e.preventDefault();
const title = document.getElementById("title").value;
const content = document.getElementById("content").value;

if (!title || !content) {
alert("제목과 내용을 입력하세요.");
return;
}

try {
const response = await fetch("/api/writePost", { // URL 수정
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        title,
        content,
    }),
});

const result = await response.json();
if (result.success) {
    // 글 작성이 성공하면 페이지를 새로고침하여 새로운 글을 표시
    window.location.reload();
} else {
    alert("글 작성에 실패했습니다.");
}
} catch (error) {
console.error("글 작성 오류:", error);
alert("글 작성 중 오류가 발생했습니다.");
}
});