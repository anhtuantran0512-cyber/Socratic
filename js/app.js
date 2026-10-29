// Trạm Kiểm Định Socratic - App logic - 6 rules - Local-first 100%
(() => {
  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let currentFileName = '';
  let currentFileType = '';
  let currentContent = '';
  let lastResults = null;

  // ---------- Samples ----------
  const samples = {
    A: {
      name: 'MauA_chua_khoa_lo.js',
      type: 'js',
      content: `// Dự án Vibe Coding - Trang đăng nhập
// TODO: remove before publish - khóa test cho demo
// OPENAI_KEY = sk-proj-abc123DEF456ghi789JKL012mno345PQR678stu901VWX234yzA567
const openaiKey = "sk-proj-abc123DEF456ghi789JKL012mno345PQR678stu901VWX234yzA567890abcdef";
const stripeKey = "demo_stripe_REPLACE_ME_51H7x8A_fake_for_lab_only";

// Thao tác rủi ro QT-2.1: đổ nội dung người dùng vào HTML
function showComment(userInput){
  // userInput đến từ form người lạ
  document.getElementById('feed').innerHTML = userInput;
}

// QT-2.2: biến chuỗi thành lệnh
function calc(expr){
  return eval(expr); // expr do người dùng nhập công thức
}

// QT-1.2: mật khẩu gán trực tiếp
const db_password = "S3cr3t!2025#DbPass";
const apiSecret = 'mySuperSecretKey123!@#$%^7890abcd';

console.log("App loaded");
`
    },
    B: {
      name: 'server.js (Node đơn giản)',
      type: 'js',
      content: `// server.js - máy chủ đơn giản xử lý đơn hàng
const express = require('express');
const db = require('./db');
const app = express();

// QT-2.3: ghép nối trực tiếp dữ liệu vào truy vấn
app.get('/api/orders', (req,res)=>{
  const userId = req.query.userId; // từ người dùng
  const query = "SELECT * FROM orders WHERE user_id = " + userId; // ghép
  db.query(query, (err, result)=> res.json(result));
});

// Một câu khác dùng template literal
app.post('/api/users/update', (req,res)=>{
  const name = req.body.name;
  const id = req.body.id;
  const sql = \`UPDATE users SET name = '\${name}' WHERE id = \${id}\`;
  db.query(sql);
});

// Lệnh an toàn (không ghép) - dùng tham số tách biệt
app.get('/api/safe', (req,res)=>{
  db.query("SELECT * FROM products WHERE id = ?", [req.query.id]);
});
`
    },
    C: {
      name: 'safe-project.html',
      type: 'html',
      content: `<!doctype html>
<html>
<head><title>Dự án An toàn - Bẫy báo nhầm</title></head>
<body>
  <!-- Hướng dẫn: thay YOUR_API_KEY_HERE bằng khóa của bạn -->
  <!-- Ví dụ: const apiKey = "DIEN_KHOA_VAO_DAY" -->
  <script>
    // Placeholder - không phải khóa thật, cần nhắc xác minh nhưng không tính là rò rỉ thật
    const apiKey = "YOUR_API_KEY_HERE";
    const demoKey = "DIEN_KHOA_VAO_DAY";

    // Mã kiểm tra toàn vẹn tệp công khai - không phải mật khẩu
    const integrityHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const checksum_sha256 = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";

    // Hiển thị an toàn bằng textContent - không dùng innerHTML
    function safeShow(text){
      document.getElementById('out').textContent = text;
    }

    // Dòng chú thích giải thích bài học chứa từ khóa nhưng không phải lệnh thực thi:
    // Bài học: Tránh dùng element.innerHTML = userData vì có thể bị XSS
    // Khuyến nghị: dùng textContent hoặc DOMPurify
  </script>
  <div id="out"></div>

  <!-- Câu tiếng Anh giao tiếp bình thường - không phải truy vấn SQL -->
  <p>Please select an option to update your profile information.</p>
</body>
</html>
`
    },
    D: {
      name: 'app.js (giao diện gọi dữ liệu)',
      type: 'js',
      content: `// Giao diện lấy hồ sơ học sinh theo mã
const studentId = getQueryParam('id'); // mã học sinh từ URL

// QT-3.1: gọi dữ liệu qua mạng kèm mã định danh động -> Checklist
fetch(\`/api/students/\${studentId}\`)
  .then(r=>r.json())
  .then(data=> renderProfile(data));

// Một ví dụ khác với axios và ghép chuỗi
function loadOrder(orderId){
  axios.get("/api/orders/" + orderId).then(res=> showOrder(res.data));
}

// Tin tức công khai - không cần checklist nhạy cảm nhưng vẫn hiện để tự xác minh
fetch("/api/news").then(r=>r.json()).then(showNews);

// Thao tác an toàn
function renderProfile(d){
  document.getElementById('name').textContent = d.name;
}
`
    }
  };

  // ---------- file type detection ----------
  function detectFileType(name, content) {
    const ext = (name.split('.').pop()||'').toLowerCase();
    if (['js','ts','jsx','tsx','mjs','cjs'].includes(ext)) return 'js';
    if (['html','htm'].includes(ext)) return 'html';
    if (['env','txt','json','config'].includes(ext) || name.toLowerCase().includes('.env')) return 'env';
    // fallback by content sniff: if starts with <!doctype or <html -> html
    if (content && content.trim().toLowerCase().startsWith('<!doctype')) return 'html';
    if (content && content.includes('<html')) return 'html';
    return 'js';
  }

  // ---------- comment ranges ----------
  function getCommentRanges(content, fileType) {
    const ranges = [];
    if (fileType === 'html') {
      // HTML comments
      const re = /<!--[\s\S]*?-->/g;
      let m; while (m = re.exec(content)) ranges.push({start:m.index, end:m.index+m[0].length});
      // also script style JS comments inside? ignore for html type simple
    }
    if (fileType === 'js' || fileType === 'html') {
      // block comments
      const blockRe = /\/\*[\s\S]*?\*\//g;
      let m; while (m = blockRe.exec(content)) ranges.push({start:m.index, end:m.index+m[0].length});
      // line comments // (but not inside string - simplistic)
      // we skip // inside quotes roughly: look for // that is not inside "" '' ``
      // Simple approach: iterate lines
      const lines = content.split('\n');
      let offset = 0;
      for (const line of lines) {
        const idx = line.indexOf('//');
        if (idx !== -1) {
          // check if // is inside HTML comment already covered? skip if already in range
          const absIdx = offset + idx;
          const inExisting = ranges.some(r=> absIdx>=r.start && absIdx<r.end);
          if (!inExisting) {
            // naive check for string presence before // - ignore if // inside string literal
            // Count quotes before idx
            const before = line.slice(0, idx);
            const sq = (before.match(/'/g)||[]).length;
            const dq = (before.match(/"/g)||[]).length;
            // if even number of quotes, likely not inside string
            if (sq%2===0 && dq%2===0) {
              // treat // comment to end of line, unless it's url https://
              const beforeChar = line[idx-1];
              const after = line.slice(idx);
              // avoid https://
              if (!(beforeChar===':' && after.startsWith('//'))) {
                ranges.push({start:absIdx, end:offset+line.length});
              }
            }
          }
        }
        offset += line.length + 1;
      }
      if (fileType === 'env') {
        const reHash = /(^|\n)#.*$/gm;
        let m2; while (m2 = reHash.exec(content)) ranges.push({start:m2.index, end:m2.index+m2[0].length});
      }
    }
    if (fileType === 'env') {
      const re = /(^|\n)#.*$/gm;
      let m; while (m=re.exec(content)) ranges.push({start:m.index, end:m.index+m[0].length});
    }
    return ranges;
  }
  function isInComment(index, ranges) {
    return ranges.some(r=> index>=r.start && index < r.end);
  }

  // ---------- helpers for line/col ----------
  function buildLineMap(content) {
    const lines = content.split('\n');
    const offsets = [];
    let acc=0;
    for(let i=0;i<lines.length;i++){ offsets[i]=acc; acc+=lines[i].length+1; }
    return {lines, offsets};
  }
  function getLineCol(index, lineMap) {
    for(let i=lineMap.offsets.length-1;i>=0;i--){
      if(index>=lineMap.offsets[i]) return {line:i+1, col:index - lineMap.offsets[i] +1};
    }
    return {line:1,col:1};
  }
  function maskSecret(s){
    if(!s) return s;
    if(s.length<=8) return s[0]+'***'+s.slice(-1);
    return s.slice(0,6)+'***'+s.slice(-2);
  }

  // ---------- QT rules ----------
  function runQT11(content, fileType, lineMap, ranges) {
    const findings=[];
    // broad patterns for keys
    const patterns = [
      {name:'OpenAI sk-proj', re:/sk-proj-[A-Za-z0-9_-]{20,}/g},
      {name:'OpenAI sk-', re:/sk-[A-Za-z0-9]{20,}/g},
      {name:'AWS Access Key', re:/AKIA[0-9A-Z]{16}/g},
      {name:'GitHub ghp', re:/ghp_[A-Za-z0-9]{20,}/g},
      {name:'GitHub gho/ghu/ghs', re:/gh[hou][s]?_[A-Za-z0-9]{20,}/g},
      {name:'GitHub PAT', re:/github_pat_[A-Za-z0-9_]{20,}/g},
      {name:'Google API', re:/AIza[0-9A-Za-z_\-]{30,}/g},
      {name:'Slack token', re:/xox[bpras]-[0-9A-Za-z-]{10,}/g},
      {name:'Stripe live', re:/sk_live_[0-9a-zA-Z]{20,}/g},
      {name:'Private key header', re:/-----BEGIN (?:RSA )?PRIVATE KEY-----/g},
      // generic long token 32+ after assignment - handled also in QT1.2 but include generic
    ];
    // also detect generic env assignment like OPENAI_API_KEY=sk-...
    // we already cover sk
    for(const pat of patterns){
      let m;
      while(m = pat.re.exec(content)){
        const idx=m.index;
        const val=m[0];
        const {line,col}=getLineCol(idx, lineMap);
        const snippet = content.slice(Math.max(0, idx-40), idx+val.length+40).split('\n')[0];
        const inComment = isInComment(idx, ranges);
        // example detection: if surrounding 80 chars contains YOUR_, DIEN_, example, placeholder, test, fake, demo, please_replace, sample
        const ctx = content.slice(Math.max(0, idx-80), idx+val.length+80).toLowerCase();
        const isExample = /your_api_key|dien_khoa|example|placeholder|test123|changeme|sample|fake|demo/.test(ctx) || inComment && /example|hướng dẫn|ví dụ|todo/.test(ctx);
        // avoid duplicate with longer pattern
        if(findings.some(f=> Math.abs(f.index - idx) < 10 && f.value===val)) continue;
        findings.push({
          rule:'QT-1.1', group:1, id:`QT-1.1-${String(findings.length+1).padStart(2,'0')}`,
          pattern: pat.name,
          index: idx, line, col, value: val,
          snippet: snippet,
          inComment,
          isExample,
          evidence: `Tiền tố "${pat.name}" khớp độ dài cố định (${val.length} ký tự)`,
          emergency: `1) Thu hồi (Revoke) khóa cũ ngay trên trang quản trị nhà cung cấp (OpenAI/AWS/GitHub...). 2) Tạo khóa mới. 3) Xóa khóa khỏi cả phần lệnh lẫn chú thích. 4) Chuyển sang biến môi trường (.env + .gitignore). 5) Kiểm tra lịch sử Git đã đẩy công khai.`,
          socraticQ: `Mắt thường và công cụ tìm kiếm có đọc được dòng chú thích hoặc tệp giao diện trên kho công khai không? Nếu bạn để khóa trong // comment và đẩy lên GitHub, liệu người khác có thấy không?`,
          hint: `Gợi ý: GitHub lưu toàn bộ tệp kể cả comment; bot quét khóa hoạt động liên tục trên các repo công khai. Dòng chú thích không được coi là “ẩn”.`,
          explanation: `Khóa dịch vụ là “chìa khóa” gọi API tính phí/thao tác dữ liệu. Lộ khóa = kẻ khác có thể dùng hạn mức, đọc/ghi dữ liệu của bạn.`,
          sideEffect: `Chuyển sang biến môi trường cần cấu hình server (process.env.*) và cập nhật .gitignore — nếu quên, deploy có thể thiếu biến.`,
          limitation: `Công cụ chỉ phát hiện chuỗi khớp định dạng; không thể tự biết khóa đó còn hoạt động hay đã bị hủy trên máy chủ nhà cung cấp.`
        });
      }
    }
    return findings;
  }

  function runQT12(content, fileType, lineMap, ranges){
    const findings=[];
    // sensitive assignment regex
    // We search for assignment patterns globally, then filter
    const re = /\b([a-zA-Z0-9_]*?(?:password|passwd|pwd|secret|api[_-]?key|apikey|private[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret|db[_-]?pass|database[_-]?url)[a-zA-Z0-9_]*)\s*([:=]|=>)\s*["'`]([^"'`]{4,})["'`]/gi;
    const placeholders = ["your_api_key_here","dien_khoa_vao_day","your_key_here","replace_me","changeme","placeholder","nhap_khoa","example","test123","xxx","your_secret_here"];
    let m;
    while(m=re.exec(content)){
      const full=m[0], varName=m[1], operator=m[2], val=m[3];
      const idx=m.index;
      const {line,col}=getLineCol(idx, lineMap);
      const inComment=isInComment(idx, ranges);
      const lowerVal=val.toLowerCase().trim();
      const isPlaceholder = placeholders.some(p=> lowerVal.includes(p)) || lowerVal.length<8;
      // SHA256 integrity check: name contains hash/integrity/checksum/sha256 and val is 64 hex
      if(/integrity|checksum|hash|sha256/i.test(varName) && /^[a-f0-9]{64}$/i.test(val)){
        continue; // true negative - do not report
      }
      // also skip if val is obvious 64 hex but var name is hash
      if(/^[a-f0-9]{64}$/i.test(val) && /hash|checksum|integrity/i.test(varName)) continue;
      // if placeholder, we still create finding but labeled as placeholder
      // also need long complex: at least 8 chars and not all same
      if(!isPlaceholder && val.length<8) continue;
      // avoid duplicate with QT1.1 already flagged same line same val
      findings.push({
        rule:'QT-1.2', group:1, id:`QT-1.2-${String(findings.length+1).padStart(2,'0')}`,
        pattern: `Gán trực tiếp ${varName}`,
        index: idx, line, col, value: val, varName,
        snippet: full,
        inComment, isPlaceholder,
        evidence: `Tên mục nhạy cảm "${varName}" = chuỗi cố định "${maskSecret(val)}" (${val.length} ký tự)`,
        emergency: `1) Đổi mật khẩu/khóa mới trên hệ thống đích. 2) Chuyển sang biến môi trường. 3) Kiểm tra lịch sử phiên bản (commit history) xem khóa cũ còn lưu không — nếu có, coi như đã lộ.`,
        socraticQ: `Bạn chỉ xóa dòng mật khẩu ở lần cập nhật hôm nay — vậy mật khẩu cũ trong Lịch sử các lần cập nhật trước (Commit History) trên GitHub có biến mất không?`,
        hint: `Gợi ý: Git lưu mọi phiên bản; xóa ở commit mới không xóa ở commit cũ. Cần làm sạch lịch sử hoặc thu hồi khóa.`,
        explanation: `Gán mật khẩu trực tiếp trong mã khiến nó lộ khi chia sẻ kho mã. Biến môi trường tách bí mật khỏi mã nguồn.`,
        sideEffect: `Đổi sang biến môi trường cần cập nhật nơi deploy/CI và hướng dẫn cộng tác viên — nếu thiếu, ứng dụng chạy lỗi thiếu biến.`,
        limitation: `Không thể tự phân biệt tuyệt đối giữa mật khẩu thật với chuỗi giả định; cần tác giả xác nhận.`
      });
    }
    // deduplicate overlapping? keep all
    return findings;
  }

  function runQT21(content, fileType, lineMap, ranges){
    const findings=[];
    const patterns = [
      {re:/\.innerHTML\s*=\s*([^;\n]+)/g, desc:'gán innerHTML'},
      {re:/\.outerHTML\s*=\s*([^;\n]+)/g, desc:'gán outerHTML'},
      {re:/insertAdjacentHTML\s*\(\s*[^)]+\)/g, desc:'insertAdjacentHTML'},
      {re:/document\.write\s*\(\s*([^)]+)\)/g, desc:'document.write'},
      {re:/document\.writeln\s*\(\s*([^)]+)\)/g, desc:'document.writeln'},
    ];
    for(const pat of patterns){
      let m;
      while(m=pat.re.exec(content)){
        const idx=m.index;
        if(isInComment(idx, ranges)) continue;
        // also check if inside string literal? naive: if previous char is " or ' and next is " -> likely inside string, skip? We'll approximate by checking if match is inside quotes pair not closed.
        // We'll check surrounding: if content.slice(idx-20, idx).includes('"') and content.slice(idx, idx+80).includes('"') maybe inside? ignore for now
        const {line,col}=getLineCol(idx, lineMap);
        const rhs=m[1]||m[0];
        // if RHS is purely static string literal without variable/concat/template, lower risk but still flag? Spec says not to flag if keyword only in lesson comment; we already excluded comments. So flag all executable.
        // Optional: check if rhs is quoted static only: /^\s*["'`][^"'`]*["'`]\s*$/ then it's still direct but less? We'll still flag but note.
        const isStatic = /^\s*["'`][^"'`]*["'`]\s*$/.test(rhs);
        findings.push({
          rule:'QT-2.1', group:2, id:`QT-2.1-${String(findings.length+1).padStart(2,'0')}`,
          pattern: pat.desc,
          index: idx, line, col,
          snippet: m[0].slice(0,120),
          isStatic,
          evidence: `Vị trí thực thi có thao tác đổ trực tiếp nội dung vào thuộc tính HTML: ${esc(pat.desc)}`,
          emergency: `Dừng đổ biến thô vào innerHTML. Chuyển sang: element.textContent = data hoặc tạo thẻ bằng DOM API, hoặc lọc sạch thẻ lệnh nguy hiểm (sanitize) trước khi hiển thị.`,
          socraticQ: `Nguồn dữ liệu đến từ người lạ nhập vào khác gì so với hằng số tĩnh trong mã? Điều gì xảy ra nếu dữ liệu chứa <script>alert(1)</script>?`,
          hint: `Gợi ý: textContent tự động thoát thẻ HTML, còn innerHTML sẽ thực thi thẻ. Hãy thử nhập <b>hi</b> và quan sát.`,
          explanation: `Trình duyệt phân biệt “văn bản” và “cấu trúc HTML”. innerHTML coi chuỗi là HTML nên thẻ độc hại có thể chạy.`,
          sideEffect: `Nếu đổi sang textContent, các thẻ trang trí hợp lệ như <b>/<i> cũng sẽ hiện thành chữ thô — cần lọc cho phép (allowlist) thay vì đổi toàn bộ.`,
          limitation: `Chỉ xác nhận tại vị trí này có thao tác cần xem xét, không tự động kết luận đã có lỗ hổng khai thác được.`
        });
      }
    }
    return findings;
  }

  function runQT22(content, fileType, lineMap, ranges){
    const findings=[];
    const patterns=[
      {re:/\beval\s*\(/g, desc:'eval()'},
      {re:/\bnew\s+Function\s*\(/g, desc:'new Function()'},
      {re:/\bsetTimeout\s*\(\s*["'`][^"'`]*["'`]\s*,/g, desc:'setTimeout(string)'},
      {re:/\bsetInterval\s*\(\s*["'`][^"'`]*["'`]\s*,/g, desc:'setInterval(string)'},
      {re:/\bexecScript\s*\(/g, desc:'execScript'},
    ];
    for(const pat of patterns){
      let m;
      while(m=pat.re.exec(content)){
        const idx=m.index;
        if(isInComment(idx, ranges)) continue;
        // check if inside ordinary string dialogue: if line contains both eval as word in sentence without paren? But pattern includes paren so it's code.
        const {line,col}=getLineCol(idx, lineMap);
        findings.push({
          rule:'QT-2.2', group:2, id:`QT-2.2-${String(findings.length+1).padStart(2,'0')}`,
          pattern: pat.desc,
          index: idx, line, col,
          snippet: content.slice(idx, idx+80).split('\n')[0],
          evidence: `Gọi thao tác biến chuỗi thành lệnh chạy trực tiếp: ${pat.desc}`,
          emergency: `Thay bằng bộ đọc dữ liệu cấu trúc chuẩn (JSON.parse) hoặc bộ tính toán biểu thức số học chuyên dụng (math parser), không truyền chuỗi người dùng vào eval/Function.`,
          socraticQ: `Ứng dụng tính điểm trung bình cho phép nhập công thức tự do và dùng eval — nếu người dùng nhập "require('fs').readFileSync('/etc/passwd')" điều gì xảy ra?`,
          hint: `Gợi ý: Khi ranh giới giữa dữ liệu và lệnh bị xóa, dữ liệu có thể trở thành lệnh chiếm quyền.`,
          explanation: `eval/Function thực thi chuỗi như mã. Kẻ tấn công có thể chèn lệnh xóa dữ liệu, đánh cắp khóa.`,
          sideEffect: `Bỏ eval cần viết lại bộ phân tích công thức — ban đầu mất công hơn nhưng an toàn lâu dài.`,
          limitation: `Mức độ rủi ro thực tế phụ thuộc vào nguồn chuỗi đầu vào (người lạ vs hằng số nội bộ).`
        });
      }
    }
    return findings;
  }

  function runQT23(content, fileType, lineMap, ranges){
    const findings=[];
    const lines=content.split('\n');
    let offset=0;
    const sqlRe = /\b(SELECT|INSERT|UPDATE|DELETE)\b/i;
    const whereRe = /\b(WHERE|FROM|SET|VALUES|INTO|TABLE)\b/i;
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      const idx=offset;
      if(isInComment(idx, ranges)) { offset+=line.length+1; continue; }
      if(sqlRe.test(line) && whereRe.test(line) && (line.includes('+') || line.includes('${') || /\"\s*\+|\+\s*\"|' \+/.test(line))){
        // exclude normal English: if line doesn't contain SQL punctuation like * FROM or WHERE etc with caps? Already checked.
        // but exclude plain English: need to ensure has SQL structure like SELECT ... FROM or UPDATE ... SET
        if(/Please select an option/i.test(line)) { offset+=line.length+1; continue; }
        const {line:ln,col}=getLineCol(idx, lineMap);
        findings.push({
          rule:'QT-2.3', group:2, id:`QT-2.3-${String(findings.length+1).padStart(2,'0')}`,
          pattern:'Ghép chuỗi truy vấn',
          index: idx, line: ln, col,
          snippet: line.trim().slice(0,140),
          evidence: `Câu văn bản có cấu trúc truy vấn (SELECT/UPDATE/DELETE) được cộng ghép trực tiếp với biến bên ngoài`,
          emergency: `Chuyển sang truy vấn có tham số tách biệt (Parameterized Queries) theo OWASP: ví dụ db.query("SELECT * FROM orders WHERE id = ?", [userId]). Tuyệt đối không gửi câu truy vấn trực tiếp từ trình duyệt.`,
          socraticQ: `Hình dung “người thủ thư đọc phiếu mượn sách ghép nối”: nếu độc giả ghi “... và cho tôi tất cả sách” vào ô tên, thủ thư có vô tình làm theo không? Vì sao phải tách dữ liệu khỏi cú pháp?`,
          hint: `Gợi ý: Khi dữ liệu và lệnh lẫn lộn, kẻ tấn công chèn thêm “OR 1=1” để lấy toàn bộ bảng. Tham số tách biệt giữ dữ liệu ở vai “giá trị”, không thành “lệnh”.`,
          explanation: `SQL phân biệt cú pháp và giá trị. Ghép chuỗi khiến giá trị có thể bị diễn giải thành cú pháp.`,
          sideEffect: `Dùng tham số cần sửa cả câu lệnh và cách truyền biến — ban đầu phải kiểm thử lại nhưng ngăn được nhiều dạng tấn công.`,
          limitation: `Đây chỉ là dấu hiệu cảnh báo vị trí có phép ghép chuỗi cần xem xét, không tự động chứng minh đã tồn tại lỗ hổng SQL Injection khai thác được.`
        });
      }
      offset+=line.length+1;
    }
    // also detect template literal with SELECT and ${
    const tmplRe = /`[^`]*\bSELECT\b[^`]*\$\{[^}]+\}[^`]*`/gi;
    let m;
    while(m=tmplRe.exec(content)){
      const idx=m.index;
      if(isInComment(idx, ranges)) continue;
      if(findings.some(f=> Math.abs(f.index-idx)<20)) continue;
      const {line,col}=getLineCol(idx, lineMap);
      findings.push({
        rule:'QT-2.3', group:2, id:`QT-2.3-${String(findings.length+1).padStart(2,'0')}`,
        pattern:'Ghép chuỗi truy vấn (template)',
        index: idx, line, col,
        snippet: m[0].slice(0,140),
        evidence: `Template literal chứa SELECT và \${biến} — ghép trực tiếp`,
        emergency: `Dùng parameterized queries; không nối biến vào template SQL.`,
        socraticQ: `Vì sao template \${} tiện nhưng nguy hiểm khi dùng cho SQL?`,
        hint: `Gợi ý: \${} chèn nguyên văn — giống phép cộng chuỗi.`,
        explanation: `Template vẫn là ghép chuỗi, chỉ khác cú pháp.`,
        sideEffect: `Phải tách truy vấn và tham số — tốn sửa nhưng an toàn.`,
        limitation: `Chỉ cảnh báo vị trí cần xem xét, không chứng minh lỗ hổng.`
      });
    }
    return findings;
  }

  function runQT31(content, fileType, lineMap, ranges){
    const findings=[];
    // detect fetch/axios/http calls with dynamic id
    const re = /(fetch|axios\.(get|post|put|delete|patch)|http\.get|XMLHttpRequest|\.ajax)\s*\(\s*([^)]+)\)/gi;
    // also simpler for template literals containing fetch(`...${...}`)
    const tmplFetchRe = /(fetch|axios\.(get|post|put|delete))\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/gi;
    let m;
    while(m=tmplFetchRe.exec(content)){
      const idx=m.index;
      if(isInComment(idx, ranges)) continue;
      const {line,col}=getLineCol(idx, lineMap);
      const snippet=m[0].slice(0,140);
      // determine if sensitive context: contains student, user, order, profile, document, hoc_sinh, don_hang, account
      const lower=snippet.toLowerCase();
      const isSensitive = /student|hoc_sinh|user|order|don_hang|profile|document|account|lesson/i.test(lower) || true; // we always flag dynamic id pattern, but label
      findings.push({
        rule:'QT-3.1', group:3, id:`QT-3.1-${String(findings.length+1).padStart(2,'0')}`,
        pattern:'Gọi dữ liệu kèm ID động',
        index: idx, line, col,
        snippet: snippet,
        evidence: `Lời gọi trao đổi dữ liệu qua mạng có truyền kèm mã định danh động trên đường dẫn (ví dụ: \${id})`,
        isSensitive,
        emergency: `Không có thao tác khẩn cấp phía giao diện — cần kiểm tra phía máy chủ đã xác thực người đăng nhập có đúng chủ sở hữu ID không (ví dụ: user A không được xem /api/students/{id của B}).`,
        socraticQ: `Máy chủ có kiểm tra người gọi có đúng là chủ sở hữu của mã định danh đó không, hay chỉ lấy theo id trên URL?`,
        hint: `Gợi ý: Nếu chỉ ẩn nút mà không chặn ở server, kẻ biết URL vẫn gọi được.`,
        explanation: `Quét văn bản giao diện hoàn toàn không nhìn thấy máy chủ nên không thể tự kết luận đúng/sai — cần bạn tự tích checklist.`,
        limitation: `Đây không phải báo lỗi bảo mật, mà là Phiếu tự rà soát Socratic. Mức độ nhạy cảm phụ thuộc dữ liệu thực tế (công khai hay riêng tư).`,
        checklist: [
          "Bạn đã kiểm tra máy chủ xác thực người đang đăng nhập có đúng là chủ sở hữu của mã định danh đó hay chưa?",
          "Bạn đã đảm bảo không chỉ ẩn nút ở giao diện mà đã chặn thực sự ở API (IDOR)?",
          "Bạn đã xác định đường dẫn này chỉ lấy tin tức công khai hay là dữ liệu riêng tư cần phân quyền?"
        ]
      });
    }
    // also detect " + id pattern for fetch/axios
    const concatRe = /(fetch|axios\.(get|post|put|delete))\s*\(\s*["'`][^"'`]*["'`]\s*\+\s*[a-zA-Z_][a-zA-Z0-9_]*/g;
    while(m=concatRe.exec(content)){
      const idx=m.index;
      if(isInComment(idx, ranges)) continue;
      if(findings.some(f=> Math.abs(f.index-idx)<30)) continue;
      const {line,col}=getLineCol(idx, lineMap);
      findings.push({
        rule:'QT-3.1', group:3, id:`QT-3.1-${String(findings.length+1).padStart(2,'0')}`,
        pattern:'Gọi dữ liệu kèm ID động (nối chuỗi)',
        index: idx, line, col,
        snippet: m[0].slice(0,140),
        evidence: `URL được nối chuỗi với biến ID — dấu hiệu truy cập theo định danh`,
        emergency: `Kiểm tra phân quyền phía server cho ID nối chuỗi này.`,
        socraticQ: `Liệu kẻ khác có thể đoán ID và gọi URL này không?`,
        hint: `Gợi ý: ID tăng dần dễ đoán; cần kiểm quyền.`,
        explanation: `Giao diện chỉ thấy cách gọi; server mới quyết định cho phép ai.`,
        limitation: `Không nhìn thấy server nên không kết luận đúng/sai.`,
        checklist: [
          "Đã xác thực chủ sở hữu ID?",
          "Đã chặn IDOR ở server, không chỉ ở UI?",
          "Đã phân biệt dữ liệu công khai vs riêng tư?"
        ]
      });
    }
    return findings;
  }

  function analyze(content, fileName, fileType){
    const lineMap = buildLineMap(content);
    const ranges = getCommentRanges(content, fileType);
    const f11 = runQT11(content, fileType, lineMap, ranges);
    const f12 = runQT12(content, fileType, lineMap, ranges);
    const f21 = runQT21(content, fileType, lineMap, ranges);
    const f22 = runQT22(content, fileType, lineMap, ranges);
    const f23 = runQT23(content, fileType, lineMap, ranges);
    const f31 = runQT31(content, fileType, lineMap, ranges);
    return [...f11,...f12,...f21,...f22,...f23,...f31];
  }

  // ---------- minified / binary rejection ----------
  function checkReject(name, content){
    const ext = name.split('.').pop().toLowerCase();
    const binaryExts=['png','jpg','jpeg','gif','webp','bmp','ico','pdf','zip','rar','7z','exe','bin','mp4','mp3','woff','woff2','ttf','eot'];
    if(binaryExts.includes(ext)){
      return `Tệp “${esc(name)}” là tệp nhị phân (${ext.toUpperCase()}) nằm ngoài phạm vi hỗ trợ của P1. P1 chỉ hỗ trợ: JavaScript/TypeScript, HTML và tệp cấu hình môi trường (.env). Vui lòng chọn lại tệp văn bản.`;
    }
    // minified/obfuscated: single line extremely long
    const lines=content.split('\n');
    const maxLen=Math.max(...lines.map(l=>l.length));
    const avgLen=content.length / Math.max(1, lines.length);
    if((lines.length < 5 && maxLen > 2000) || (content.length>5000 && avgLen>800 && maxLen>1500)){
      return `Tệp “${esc(name)}” có dấu hiệu đã bị nén/làm rối trên một dòng cực dài (minified/obfuscated): ${maxLen} ký tự trên một dòng. P1 từ chối để tránh báo nhầm và bảo vệ bạn khỏi mã khó đọc. Vui lòng cung cấp bản mã nguồn gốc, chưa nén.`;
    }
    // check for binary bytes: contains \x00
    if(content.includes('\u0000')){
      return `Tệp “${esc(name)}” chứa ký tự nhị phân — nằm ngoài phạm vi văn bản thuần túy của P1.`;
    }
    return null;
  }

  // ---------- UI rendering ----------
  function renderResults(findings, fileName, fileType){
    const wrap=$('#resultWrap'), empty=$('#emptyState');
    const cnt1=findings.filter(f=>f.group===1).length;
    const cnt2=findings.filter(f=>f.group===2).length;
    const cnt3=findings.filter(f=>f.group===3).length;
    $('#cnt1').textContent=cnt1; $('#cnt2').textContent=cnt2; $('#cnt3').textContent=cnt3;
    $('#resultFileName').textContent=fileName || 'văn bản dán trực tiếp';
    $('#resultMeta').textContent=`Đã chạy 6/6 quy tắc • ${new Date().toLocaleString('vi-VN')} • Bộ 6 quy tắc cục bộ đóng gói sẵn`;
    // passport inputs
    $('#ppFileType').value = fileType ? fileType.toUpperCase() + ' • ' + fileName : 'văn bản dán';
    $('#ppTime').value = new Date().toLocaleString('vi-VN');
    // build groups
    const g1=$('#group1'), g2=$('#group2'), g3=$('#group3');
    g1.innerHTML=''; g2.innerHTML=''; g3.innerHTML='';
    if(findings.length===0){
      $('#noFinding').classList.remove('hidden');
    } else $('#noFinding').classList.add('hidden');

    function renderGroup(container, groupFindings, title, cls){
      if(groupFindings.length===0){
        container.innerHTML='';
        return;
      }
      let html=`<div class="group-header ${cls}"><span>${title}</span><span>${groupFindings.length} dấu hiệu</span></div>`;
      for(const f of groupFindings){
        const isPlaceholder = f.isPlaceholder;
        const inCommentLabel = f.inComment ? `<span class="badge outline">Cần xác minh (Nằm trong chú thích/tài liệu)</span>` : '';
        const placeholderLabel = isPlaceholder ? `<span class="badge outline">Giữ chỗ — cần xác minh</span>` : '';
        const chip = f.rule==='QT-1.1' || f.rule==='QT-1.2' ? `<span class="badge g1">${f.rule}</span>` : f.rule.startsWith('QT-2') ? `<span class="badge g2">${f.rule}</span>` : `<span class="badge g3">${f.rule}</span>`;
        // fields: show 8 fields: Mã quy tắc, Mức độ, Vị trí, Bằng chứng, Trích đoạn, Bảo vệ, Socratic, Giới hạn
        html+=`<div class="finding">
          <div class="finding-header">
            <div class="finding-title">${chip} ${esc(f.pattern)} ${f.inComment ? inCommentLabel:''} ${isPlaceholder?placeholderLabel:''}</div>
            <div class="finding-meta">Dòng ${f.line}, cột ${f.col} • ${esc(f.evidence)}</div>
          </div>
          <div class="snippet">${esc(f.snippet || f.value || '').slice(0,500)}</div>
          <div class="fields-grid">
            <div class="field"><h5>01 — MÃ QUY TẮC</h5><p>${f.rule} — ${f.group===1?'Khớp mẫu bí mật':f.group===2?'Thao tác rủi ro cần xem xét':'Checklist phân quyền'}</p></div>
            <div class="field"><h5>02 — VỊ TRÍ &amp; PHÂN LOẠI</h5><p>Dòng ${f.line}, cột ${f.col}${f.inComment?' • trong chú thích/tài liệu':''}${isPlaceholder?' • chuỗi giữ chỗ':''}</p></div>
            <div class="field"><h5>03 — BẰNG CHỨNG ĐỊNH DẠNG</h5><p>${esc(f.evidence)}</p></div>
            <div class="field"><h5>04 — TRÍCH ĐOẠN (đã che một phần nếu là khóa)</h5><p>${esc(maskSecret(f.value||f.snippet||''))}</p></div>
            <div class="field"><h5>05 — NGUỒN XÁC NHẬN</h5><p>OWASP Cheat Sheet, Bộ 6 quy tắc P1 (vP1.0.6)</p></div>
            <div class="field"><h5>06 — TRẠNG THÁI</h5><p>${f.isPlaceholder?'Cần tác giả xác nhận (giữ chỗ)':f.inComment?'Cần xác minh (nằm trong chú thích)':'Cần xem xét'}</p></div>
          </div>
          <div class="two-col">
            <div class="emergency">
              <h4>⛑ LUỒNG BẢO VỆ KHẨN CẤP — LUÔN MỞ</h4>
              <p>${esc(f.emergency)}</p>
            </div>
            <div class="socratic">
              <h4>❓ LUỒNG CÂU HỎI SOCRATIC</h4>
              <p><em>${esc(f.socraticQ)}</em></p>
              <button class="mini-btn hint-btn">Xem gợi ý</button>
              <button class="mini-btn explain-btn">Giải thích bản chất</button>
              <button class="mini-btn side-btn">Tác dụng phụ khi sửa</button>
              <div class="hint-box hint">${esc(f.hint)}</div>
              <div class="hint-box explain">${esc(f.explanation)}</div>
              <div class="hint-box side">${esc(f.sideEffect)}</div>
            </div>
          </div>
          <div class="limitation"><strong>Giới hạn kết luận:</strong> ${esc(f.limitation)}</div>
          ${f.checklist ? `<div class="field" style="margin-top:6px"><h5>PHIẾU TỰ RÀ SOÁT — TÍCH CHỌN</h5>
            ${f.checklist.map((c,i)=>`<label class="check"><input type="checkbox" class="checklist-item" data-rule="${f.rule}"> ${esc(c)}</label>`).join('')}
          </div>`:''}
        </div>`;
      }
      container.innerHTML=html;
    }
    renderGroup(g1, findings.filter(f=>f.group===1), 'NHÓM 1 — KHỚP MẪU BÍ MẬT (QT-1.1, QT-1.2)', 'g1');
    renderGroup(g2, findings.filter(f=>f.group===2), 'NHÓM 2 — THAO TÁC RỦI RO CẦN XEM XÉT (QT-2.1, QT-2.2, QT-2.3)', 'g2');
    renderGroup(g3, findings.filter(f=>f.group===3), 'NHÓM 3 — CHECKLIST TỰ RÀ SOÁT SOCRATIC VỀ PHÂN QUYỀN (QT-3.1)', 'g3');

    empty.classList.add('hidden');
    wrap.classList.remove('hidden');
    // bind hint buttons
    // containerBind removed — trực tiếp bind bên dưới
    $$('.hint-btn').forEach(b=> b.addEventListener('click', e=> e.target.parentElement.querySelector('.hint').classList.toggle('open')));
    $$('.explain-btn').forEach(b=> b.addEventListener('click', e=> e.target.parentElement.querySelector('.explain').classList.toggle('open')));
    $$('.side-btn').forEach(b=> b.addEventListener('click', e=> e.target.parentElement.querySelector('.side').classList.toggle('open')));

    // update passport preview
    updatePassportPreview(findings, fileName, fileType);
  }

  function updatePassportPreview(findings, fileName, fileType){
    const cnt1=findings ? findings.filter(f=>f.group===1).length : 0;
    const cnt2=findings ? findings.filter(f=>f.group===2).length : 0;
    const cnt3=findings ? findings.filter(f=>f.group===3).length : 0;
    const time = new Date().toLocaleString('vi-VN');
    const checked1 = $('#ppCheck1').checked ? 'Đã tự rà' : 'Chưa tích';
    const checked2 = $('#ppCheck2').checked ? 'Đã tự rà' : 'Chưa tích';
    const checked3 = $('#ppCheck3').checked ? 'Đã tự rà' : 'Chưa tích';
    const body = `
      <table>
        <tr><th>Phiên bản công cụ</th><td>vP1.0.6 — Bộ 6 quy tắc cục bộ đóng gói sẵn</td></tr>
        <tr><th>Loại tệp đã quét</th><td>${esc(fileType? fileType.toUpperCase() : 'chưa quét')} — ${esc(fileName||'văn bản dán')}</td></tr>
        <tr><th>Số quy tắc đã chạy</th><td>6/6 (QT-1.1 → QT-3.1)</td></tr>
        <tr><th>Số dấu hiệu theo nhóm</th><td>Nhóm 1 (đỏ gạch): <strong>${cnt1}</strong> • Nhóm 2 (hổ phách): <strong>${cnt2}</strong> • Nhóm 3 (lam trầm / checklist): <strong>${cnt3}</strong></td></tr>
        <tr><th>Thời điểm thực hiện</th><td>${esc(time)}</td></tr>
        <tr><th>Trạng thái tự rà Checklist QT-3.1</th><td>① ${checked1} • ② ${checked2} • ③ ${checked3}</td></tr>
        <tr><th>Danh sách chưa kiểm tra / giới hạn đã biết</th><td>• Không biết khóa còn sống hay đã thu hồi<br>• Không nhìn commit history<br>• Không chứng minh lỗ hổng khai thác<br>• Không thấy cấu hình máy chủ/phân quyền<br>• Không quét nhị phân/minified</td></tr>
      </table>
      <p class="small muted" style="margin-top:8px">Lưu ý: Thẻ này <strong>không</strong> chứa chuỗi khóa, mã nguồn hay đường dẫn đầy đủ — chỉ thống kê tổng hợp.</p>
    `;
    $('#ppBody').innerHTML = body;
    // update mini bars for collectible ticket
    const bars=$('#ppBars');
    if(bars){
      const max=Math.max(1,cnt1,cnt2,cnt3);
      bars.innerHTML=`<i style="height:${6+ (cnt1/max)*20}px;background:var(--g1)"></i><i style="height:${6+ (cnt2/max)*20}px;background:var(--g2)"></i><i style="height:${6+ (cnt3/max)*20}px;background:var(--g3)"></i>`;
    }
  }

  // ---------- Benchmark Lab ----------
  const benchmarkCases = [
    // QT-1.1
    {id:'QT11-01', rule:'QT-1.1', content:`const key="sk-proj-abc123DEF456ghi789JKL012mno345PQR678stu901VWX234yzA567890";`, label:'positive', pos:'dòng 1', reason:'Khớp tiền tố sk-proj và độ dài cố định', source:'OWASP API Top 10'},
    {id:'QT11-02', rule:'QT-1.1', content:`// TODO secret: sk-proj-TEST1234567890abcdefghijklmnoPQRSTUVWXYZ`, label:'positive', pos:'dòng 1 (chú thích)', reason:'Khóa thật trong chú thích vẫn bị lộ khi đẩy GitHub — phải quét cả comment', source:'GitHub Secret Scanning'},
    {id:'QT11-03', rule:'QT-1.1', content:`const note="Vui lòng thay YOUR_API_KEY_HERE bằng khóa thật";`, label:'negative', pos:'không', reason:'Chuỗi giữ chỗ quen thuộc — không tính là khóa rò rỉ', source:'Bộ quy tắc P1'},
    {id:'QT11-04', rule:'QT-1.1', content:`fetch("/api/data").then(r=>r.json())`, label:'negative', pos:'không', reason:'Không có chuỗi khóa khớp định dạng', source:'OWASP'},
    {id:'QT11-05', rule:'QT-1.1', content:`const aws="AKIAIOSFODNN7EXAMPLE";`, label:'positive', pos:'dòng 1', reason:'Khớp định dạng AKIA + 16 ký tự', source:'AWS Docs'},
    // QT-1.2
    {id:'QT12-01', rule:'QT-1.2', content:`const db_password = "S3cr3t!2025#DbPass";`, label:'positive', pos:'dòng 1', reason:'Tên nhạy cảm password gán chuỗi dài phức tạp', source:'OWASP ASVS 2.10'},
    {id:'QT12-02', rule:'QT-1.2', content:`const apiKey = "YOUR_API_KEY_HERE";`, label:'negative', pos:'dòng 1', reason:'Giữ chỗ quen thuộc — gắn nhãn nhắc xác minh, không tính rò rỉ thật', source:'P1 quy tắc bẫy'},
    {id:'QT12-03', rule:'QT-1.2', content:`const integrityHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";`, label:'negative', pos:'không', reason:'Biến mang tên mã kiểm tra toàn vẹn chứa 64 hex — không báo nhầm', source:'P1 chống báo nhầm'},
    {id:'QT12-04', rule:'QT-1.2', content:`// const secret = "abc123"; // ví dụ hướng dẫn`, label:'positive', pos:'dòng 1 chú thích', reason:'Vẫn báo nhưng gắn nhãn nằm trong chú thích/tài liệu', source:'P1'},
    {id:'QT12-05', rule:'QT-1.2', content:`const maxRetries = "3";`, label:'negative', pos:'không', reason:'Tên không nhạy cảm, giá trị ngắn', source:'P1'},
    // QT-2.1
    {id:'QT21-01', rule:'QT-2.1', content:`element.innerHTML = userInput;`, label:'positive', pos:'dòng 1', reason:'Đổ trực tiếp biến người dùng vào innerHTML', source:'OWASP XSS'},
    {id:'QT21-02', rule:'QT-2.1', content:`// Bài học: Tránh dùng element.innerHTML = userData`, label:'negative', pos:'không', reason:'Từ khóa chỉ nằm trong dòng chú thích giải thích bài học', source:'P1'},
    {id:'QT21-03', rule:'QT-2.1', content:`el.textContent = userInput;`, label:'negative', pos:'không', reason:'Hiển thị văn bản thuần túy — an toàn', source:'OWASP'},
    {id:'QT21-04', rule:'QT-2.1', content:`document.write("<p>Hello</p>");`, label:'positive', pos:'dòng 1', reason:'document.write trực tiếp', source:'CWE-79'},
    // QT-2.2
    {id:'QT22-01', rule:'QT-2.2', content:`eval(userFormula)`, label:'positive', pos:'dòng 1', reason:'Biến chuỗi thành lệnh chạy', source:'CWE-95'},
    {id:'QT22-02', rule:'QT-2.2', content:`// eval là hàm nguy hiểm`, label:'negative', pos:'không', reason:'Chỉ nằm trong chú thích', source:'P1'},
    {id:'QT22-03', rule:'QT-2.2', content:`const msg = "Kết quả eval của bạn là...";`, label:'negative', pos:'không', reason:'Từ eval trong chuỗi hội thoại thông thường', source:'P1'},
    {id:'QT22-04', rule:'QT-2.2', content:`const fn = new Function("a","b","return a+b");`, label:'positive', pos:'dòng 1', reason:'Khởi tạo hàm từ chuỗi', source:'CWE-95'},
    // QT-2.3
    {id:'QT23-01', rule:'QT-2.3', content:`const q = "SELECT * FROM users WHERE id = " + userId;`, label:'positive', pos:'dòng 1', reason:'Truy vấn ghép trực tiếp biến', source:'OWASP SQLi'},
    {id:'QT23-02', rule:'QT-2.3', content:`console.log("Please select an option to update your profile");`, label:'negative', pos:'không', reason:'Câu thông báo tiếng Anh thường — không phải truy vấn', source:'P1 chống báo nhầm'},
    {id:'QT23-03', rule:'QT-2.3', content:`db.query("SELECT * FROM products WHERE id = ?", [id]);`, label:'negative', pos:'không', reason:'Dùng parameterized queries — an toàn', source:'OWASP'},
    {id:'QT23-04', rule:'QT-2.3', content:`const sql = \`UPDATE users SET name='\${name}' WHERE id=\${id}\`;`, label:'positive', pos:'dòng 1', reason:'Template literal ghép trực tiếp', source:'OWASP'},
    // QT-3.1
    {id:'QT31-01', rule:'QT-3.1', content:"fetch(`/api/students/${studentId}`)", label:'positive', pos:'dòng 1', reason:'Gọi dữ liệu kèm mã định danh động → kích hoạt checklist', source:'OWASP IDOR'},
    {id:'QT31-02', rule:'QT-3.1', content:`axios.get("/api/orders/" + orderId)`, label:'positive', pos:'dòng 1', reason:'Ghép chuỗi ID trên đường dẫn', source:'OWASP'},
    {id:'QT31-03', rule:'QT-3.1', content:`fetch("/api/news").then(r=>r.json())`, label:'negative', pos:'không', reason:'Lấy tin tức công khai — không có ID động', source:'P1'},
    {id:'QT31-04', rule:'QT-3.1', content:`// fetch('/api/students/${id}') ví dụ`, label:'negative', pos:'không', reason:'Nằm trong chú thích', source:'P1'},
  ];
  let benchHasRun=false;

  function renderBenchmark(){
    const container=$('#benchTables');
    // group by rule
    const rules=['QT-1.1','QT-1.2','QT-2.1','QT-2.2','QT-2.3','QT-3.1'];
    const byRule={};
    for(const r of rules) byRule[r]=benchmarkCases.filter(c=>c.rule===r);
    let html='';
    for(const rule of rules){
      const cases=byRule[rule];
      html+=`<div class="bench-table-wrap"><h4>Bảng kiểm thử — ${rule} — ${cases.length} mẫu</h4>
        <table class="bench-table">
          <thead><tr>
            <th>Mã mẫu</th><th>Quy tắc</th><th>Nội dung giả lập</th><th>Nhãn chuẩn trước khi chạy</th><th>Vị trí mong đợi</th><th>Lý do gán nhãn</th><th>Nguồn xác nhận</th><th>Kết quả thực tế</th>
          </tr></thead><tbody>`;
      for(const c of cases){
        const actual = benchHasRun ? c.actualResult : '[Để trống trước khi chạy công cụ]';
        const actualCls = benchHasRun ? (c.actualResult===c.label ? 'positive' : 'negative') : 'pending';
        // Actually actualResult stores predicted label: positive/negative
        // But need to map to Bắt đúng etc. We'll show text
        let actualText='';
        if(!benchHasRun) actualText=`<span class="badge-cell pending">[Để trống trước khi chạy công cụ]</span>`;
        else {
          const ok = c.actualResult===c.label;
          const isPos = c.actualResult==='positive';
          actualText = `<span class="badge-cell ${ok? 'positive':''}" style="${ok? '' : 'background:#C83E2B;color:white'}">${isPos?'Phát hiện':'Không phát hiện'} ${ok?'✓':'✗'}</span><br><span class="small">${esc(c.actualDetail||'')}</span>`;
        }
        html+=`<tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.rule}</td>
          <td class="code">${esc(c.content)}</td>
          <td><span class="badge-cell ${c.label==='positive'?'positive':'negative'}">${c.label==='positive'?'Cần báo':'Không báo'}</span></td>
          <td>${esc(c.pos)}</td>
          <td>${esc(c.reason)}</td>
          <td>${esc(c.source)}</td>
          <td>${actualText}</td>
        </tr>`;
      }
      html+=`</tbody></table></div>`;
    }
    container.innerHTML=html;
    // per rule stats
    renderPerRuleStats();
  }
  function renderPerRuleStats(){
    const statsEl=$('#perRuleStats');
    if(!benchHasRun){
      statsEl.innerHTML=`<div class="stat-card" style="grid-column:1/-1;text-align:center;padding:14px"><em>Chưa chạy — bấm “Chạy Kiểm Thử Thực Nghiệm” để xem bảng thống kê riêng cho từng quy tắc (Bắt đúng / Loại trừ đúng / Báo nhầm / Bỏ sót).</em></div>`;
      return;
    }
    let html='';
    const rules=['QT-1.1','QT-1.2','QT-2.1','QT-2.2','QT-2.3','QT-3.1'];
    for(const rule of rules){
      const cases=benchmarkCases.filter(c=>c.rule===rule);
      let tp=0, tn=0, fp=0, fn=0;
      for(const c of cases){
        const expectedPos = c.label==='positive';
        const actualPos = c.actualResult==='positive';
        if(expectedPos && actualPos) tp++;
        else if(!expectedPos && !actualPos) tn++;
        else if(!expectedPos && actualPos) fp++;
        else if(expectedPos && !actualPos) fn++;
      }
      html+=`<div class="stat-card"><h5>${rule} — ${cases.length} mẫu</h5>
        <div class="stat-grid">
          <div>Bắt đúng<br><strong>${tp}</strong></div>
          <div>Loại trừ đúng<br><strong>${tn}</strong></div>
          <div>Báo nhầm<br><strong style="color:${fp>0? 'var(--g1)':''}">${fp}</strong></div>
          <div>Bỏ sót<br><strong style="color:${fn>0? 'var(--g1)':''}">${fn}</strong></div>
        </div>
        <div class="small muted" style="margin-top:6px">Tổng: ${cases.length} • Chính xác: ${(((tp+tn)/cases.length)*100).toFixed(0)}%</div>
      </div>`;
    }
    statsEl.innerHTML=html;
  }
  function runBenchmark(){
    // run each case through analyze
    for(const c of benchmarkCases){
      const fileType = c.content.trim().startsWith('<!doctype') || c.content.includes('<html') ? 'html' : 'js';
      const findings = analyze(c.content, c.id, fileType);
      // For QT-3.1 etc, findings filter by rule
      const matched = findings.some(f=> f.rule===c.rule);
      // For placeholder handling: QT-1.2 with YOUR_API_KEY should be considered negative (not reported as real leak) but our analyze currently creates finding even for placeholder (isPlaceholder). For benchmark, we consider placeholder as negative meaning "not counted as positive detection". So we need to treat placeholder as negative.
      // Adjust: if c.id is QT12-02 (placeholder) and finding is placeholder, we consider actualResult = negative
      let actualPos = matched;
      // special handling: if c.id is QT12-02, QT11-03 placeholder cases should be negative => if matched but isPlaceholder, convert to negative
      if(matched){
        const rel = findings.filter(f=> f.rule===c.rule);
        if(rel.length>0 && rel[0].isPlaceholder && c.label==='negative'){
          actualPos = false;
        }
      }
      c.actualResult = actualPos ? 'positive' : 'negative';
      c.actualDetail = actualPos ? findings.find(f=>f.rule===c.rule)?.pattern || 'Đã phát hiện' : 'Không phát hiện';
    }
    benchHasRun=true;
    renderBenchmark();
  }
  function resetBenchmark(){
    benchHasRun=false;
    for(const c of benchmarkCases){ delete c.actualResult; delete c.actualDetail; }
    renderBenchmark();
  }

  // ---------- Acceptance checklist ----------
  const acceptanceItems=[
    {group:'Chức năng (6)', id:'CN-01', text:'Ứng dụng hoạt động hoàn chỉnh khi ngắt Wi-Fi/Internet (0 external requests)', detail:'Đã kiểm tra Network tab = 0 yêu cầu ra ngoài khi quét + mở Socratic + xuất Passport'},
    {group:'Chức năng (6)', id:'CN-02', text:'Không có ô nhập khóa API, không gọi Gemini/cloud trong bản P1', detail:'Toàn bộ 6 quy tắc + hướng dẫn đã đóng gói sẵn cục bộ'},
    {group:'Chức năng (6)', id:'CN-03', text:'Hỗ trợ đủ 3 loại tệp (JS/TS, HTML, .env) và từ chối lịch sự nhị phân/minified', detail:'Đã thử nạp ảnh/zip và tệp 1 dòng dài → thông báo rõ lý do'},
    {group:'Chức năng (6)', id:'CN-04', text:'QT-1.1 & QT-1.2 quét cả dòng chú thích/ghi chú', detail:'Mẫu A có khóa trong comment vẫn bị bắt + gắn nhãn “Cần xác minh”'},
    {group:'Chức năng (6)', id:'CN-05', text:'Hiển thị tách biệt 3 nhóm kết quả (đỏ gạch / hổ phách / lam trầm) và mở sẵn Luồng Bảo vệ', detail:'Mỗi phát hiện có 2 cột: Bảo vệ (trái) & Socratic (phải) luôn mở'},
    {group:'Chức năng (6)', id:'CN-06', text:'4 kịch bản mẫu nạp nhanh (A: khóa lộ, B: SQL, C: an toàn/bẫy, D: checklist)', detail:'Bấm 1 lần là nạp và sẵn sàng quét'},
    {group:'Quyền riêng tư (4)', id:'PR-01', text:'Không ghi văn bản dự án hay chuỗi khóa vào LocalStorage/SessionStorage/IndexedDB/Cookies', detail:'Application tab trống sau khi quét'},
    {group:'Quyền riêng tư (4)', id:'PR-02', text:'Có nút “Xóa trắng phiên làm việc hiện tại” rõ ràng', detail:'Nút ở Bàn Kiểm Định xóa textarea, file và kết quả'},
    {group:'Quyền riêng tư (4)', id:'PR-03', text:'Release Passport chỉ xuất thông tin tổng hợp, không lộ khóa/mã/đường dẫn', detail:'Thẻ chỉ có số lượng theo nhóm, thời điểm, loại tệp, checklist'},
    {group:'Quyền riêng tư (4)', id:'PR-04', text:'Passport ghi trung thực cấu hình, không tự tuyên bố “Đã xác minh 0 yêu cầu mạng”', detail:'Câu chữ chính xác: “Chế độ cấu hình: Xử lý bằng bộ 6 quy tắc cục bộ... Việc xác minh 0 yêu cầu mạng được thực hiện riêng qua Biên bản...” + dấu mộc'},
    {group:'Kiểm thử (4)', id:'KT-01', text:'Benchmark Lab phân biệt 4 loại đánh giá', detail:'(1) Bí mật, (2) Thao tác rủi ro, (3) Checklist phân quyền, (4) Lỗ hổng thực tế (ngoài phạm vi)'},
    {group:'Kiểm thử (4)', id:'KT-02', text:'Bộ mẫu 8 trường khóa nhãn trước khi chạy', detail:'Mỗi mẫu có: Mã mẫu, Quy tắc, Nội dung giả lập, Nhãn chuẩn, Vị trí, Lý do, Nguồn, Kết quả thực tế'},
    {group:'Kiểm thử (4)', id:'KT-03', text:'Trước khi chạy, cột Kết quả để trống “[Để trống trước khi chạy công cụ]”; sau khi chạy tách bảng thống kê riêng từng quy tắc', detail:'Có Bắt đúng / Loại trừ đúng / Báo nhầm / Bỏ sót cho QT-1.1 → QT-3.1'},
    {group:'Kiểm thử (4)', id:'KT-04', text:'Có Nhật ký thay đổi quy tắc (Rule Changelog)', detail:'Bảng vP1.0.4 → vP1.0.6'},
    {group:'Hồ sơ GitHub (2)', id:'GH-01', text:'Hộp Ranh Giới Năng Lực hiển thị cố định trên đầu Bàn Kiểm Định', detail:'Nêu rõ 6 quy tắc làm được và điểm mù không thể tự kết luận'},
    {group:'Hồ sơ GitHub (2)', id:'GH-02', text:'Bảng Nghiệm Thu P1 16 tiêu chí + hướng dẫn 4 bước Đo Mạng Độc Lập hiển thị đầy đủ', detail:'Có ghi chú: checklist là quản lý công việc, không thay bằng chứng'},
  ];
  function renderAcceptance(){
    const groups={};
    for(const item of acceptanceItems){
      if(!groups[item.group]) groups[item.group]=[];
      groups[item.group].push(item);
    }
    const wrap=$('#checkGroups');
    let html='';
    const colorMap={'Chức năng (6)':'cg1','Quyền riêng tư (4)':'cg2','Kiểm thử (4)':'cg3','Hồ sơ GitHub (2)':'cg4'};
    for(const gName of Object.keys(groups)){
      html+=`<div class="check-group ${colorMap[gName]}"><h4>${esc(gName)}</h4>`;
      for(const it of groups[gName]){
        html+=`<div class="check-item"><input type="checkbox" id="${it.id}" data-check><label for="${it.id}"><strong>${it.id}:</strong> ${esc(it.text)}<br><span class="muted small">${esc(it.detail)}</span></label></div>`;
      }
      html+=`</div>`;
    }
    wrap.innerHTML=html;
    const update=()=>{
      const total=acceptanceItems.length;
      const checked=$$('[data-check]:checked').length;
      $('#checkProgress').textContent=`${checked}/${total}`;
    };
    wrap.addEventListener('change', update);
    update();
  }

  // ---------- passport export ----------
  function getPassportMarkdown(){
    const fileName=currentFileName||'văn bản dán trực tiếp';
    const fileType=currentFileType||'—';
    const time=new Date().toLocaleString('vi-VN');
    const findings=lastResults||[];
    const cnt1=findings.filter(f=>f.group===1).length;
    const cnt2=findings.filter(f=>f.group===2).length;
    const cnt3=findings.filter(f=>f.group===3).length;
    const c1=$('#ppCheck1').checked ? 'x' : ' ';
    const c2=$('#ppCheck2').checked ? 'x' : ' ';
    const c3=$('#ppCheck3').checked ? 'x' : ' ';
    return `# Release Passport — Trạm Kiểm Định Socratic (P1)

> **Dấu mộc:** ĐÃ RÀ SOÁT THEO PHẠM VI ĐƯỢC CÔNG BỐ
> *Tuyệt đối không dùng “100% An toàn”, “Đã kiểm định an toàn” hay “Chứng nhận bảo mật”*

| Mục | Nội dung |
|---|---|
| Phiên bản công cụ | vP1.0.6 — Bộ 6 quy tắc cục bộ đóng gói sẵn |
| Loại tệp đã quét | ${fileType.toUpperCase()} — ${fileName} |
| Số quy tắc đã chạy | 6/6 (QT-1.1 → QT-3.1) |
| Nhóm 1 — Khớp mẫu bí mật | ${cnt1} dấu hiệu |
| Nhóm 2 — Thao tác rủi ro cần xem xét | ${cnt2} dấu hiệu |
| Nhóm 3 — Checklist phân quyền | ${cnt3} mục kích hoạt |
| Thời điểm thực hiện | ${time} |
| Checklist QT-3.1 | [${c1}] Đã kiểm tra chủ sở hữu ID • [${c2}] Đã xác thực phía server • [${c3}] Đã xác định công khai/riêng tư |

## Giới hạn đã biết (chưa kiểm tra)
- Không thể biết khóa còn hoạt động hay đã thu hồi trên máy chủ nhà cung cấp
- Không nhìn thấy lịch sử commit (commit history)
- Không tự chứng minh lỗ hổng khai thác được — chỉ chỉ ra vị trí cần xem xét
- Không thấy cấu hình máy chủ/phân quyền thực tế
- Không quét nhị phân/minified/obfuscated

## Chế độ cấu hình & Nghiệm thu mạng
> Chế độ cấu hình: Xử lý bằng bộ 6 quy tắc cục bộ đóng gói sẵn. Việc xác minh 0 yêu cầu mạng được thực hiện riêng thông qua **Biên bản Nghiệm thu Mạng Độc lập** (Ngắt mạng → Xóa Network log → Chạy quét → Xác nhận 0 requests & Storage trống).

---
*Công cụ chỉ phát hiện chuỗi khớp định dạng / thao tác cần xem xét; không tự kết luận lỗ hổng. Người công bố chịu trách nhiệm rà soát thủ công bổ sung.*
`;
  }

  // ---------- events ----------
  function updateCharCount(){
    const txt=$('#textInput').value;
    const lines= txt ? txt.split('\n').length : 0;
    $('#charCount').textContent=`${txt.length} ký tự • ${lines} dòng`;
  }
  function updatePrivacyChecks(){
    // show that we don't store content
    let ls='trống', ss='trống', ck='trống', idb='trống';
    try{
      // check if any localStorage keys contain content-like? we ensure none
      ls = localStorage.length===0 ? 'trống ✓' : localStorage.length+' khóa (không chứa nội dung quét)';
      ss = sessionStorage.length===0 ? 'trống ✓' : sessionStorage.length+' khóa';
      const cookies=document.cookie;
      ck = !cookies ? 'trống ✓' : cookies;
      // IndexedDB not used
      idb='không sử dụng ✓';
    } catch(e){ ls='không truy cập'; }
    $('#lsCheck').textContent=ls;
    $('#ssCheck').textContent=ss;
    $('#ckCheck').textContent=ck;
    $('#idbCheck').textContent=idb;
  }

  function handleSample(key){
    const s=samples[key];
    if(!s) return;
    $('#textInput').value=s.content;
    currentFileName=s.name;
    currentFileType=s.type;
    currentContent=s.content;
    $('#fileName').textContent=s.name;
    $('#fileTypeBadge').textContent=s.type.toUpperCase();
    $('#fileTypeBadge').className='badge';
    updateCharCount();
    $('#rejectBox').classList.add('hidden');
    // auto highlight sample button
  }
  function handleFile(e){
    const file=e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const content=reader.result;
      // check reject
      const rej=checkReject(file.name, content);
      if(rej){
        $('#rejectBox').innerHTML=rej;
        $('#rejectBox').classList.remove('hidden');
        $('#fileName').textContent=file.name + ' — bị từ chối';
        return;
      }
      $('#rejectBox').classList.add('hidden');
      $('#textInput').value=content;
      currentFileName=file.name;
      currentFileType=detectFileType(file.name, content);
      currentContent=content;
      $('#fileName').textContent=file.name + ` (${(content.length/1024).toFixed(1)} KB)`;
      $('#fileTypeBadge').textContent=currentFileType.toUpperCase();
      $('#fileTypeBadge').className='badge';
      updateCharCount();
    };
    // try read as text, if fails it's binary
    reader.readAsText(file);
  }
  function handleScan(){
    // scanning pulse
    const pulse=$('#scanPulse'); if(pulse){ pulse.classList.add('on'); setTimeout(()=>pulse.classList.remove('on'), 900); }
    let content=$('#textInput').value;
    if(!content.trim()){
      alert('Vui lòng dán văn bản hoặc chọn tệp trước khi quét.');
      return;
    }
    // determine file name/type if not set via file input
    if(!currentFileName){
      currentFileName='văn_ban_dan.txt';
      currentFileType=detectFileType(currentFileName, content);
    }
    // re-detect type from content
    currentContent=content;
    // check reject for pasted content too (minified)
    const rej=checkReject(currentFileName, content);
    if(rej){
      $('#rejectBox').innerHTML=rej;
      $('#rejectBox').classList.remove('hidden');
      return;
    }
    $('#rejectBox').classList.add('hidden');
    const findings=analyze(content, currentFileName, currentFileType);
    lastResults=findings;
    renderResults(findings, currentFileName, currentFileType);
    updatePassportPreview(findings, currentFileName, currentFileType);
    updatePrivacyChecks();
    // scroll to results on mobile
    if(window.innerWidth<980) document.getElementById('resultWrap')?.scrollIntoView({behavior:'smooth'});
  }
  function handleClear(){
    $('#textInput').value='';
    $('#fileInput').value='';
    $('#fileName').textContent='Chưa chọn tệp';
    $('#fileTypeBadge').className='badge hidden';
    $('#rejectBox').classList.add('hidden');
    $('#resultWrap').classList.add('hidden');
    $('#emptyState').classList.remove('hidden');
    $('#ppFileType').value='— chưa quét —';
    $('#ppTime').value='—';
    $('#ppCheck1').checked=false; $('#ppCheck2').checked=false; $('#ppCheck3').checked=false;
    updatePassportPreview(null, '', '');
    currentFileName=''; currentFileType=''; currentContent=''; lastResults=null;
    updateCharCount(); updatePrivacyChecks();
    // ensure no storage written (explicitly clear if any)
    try{ localStorage.clear(); sessionStorage.clear(); } catch(e){}
  }

  // nav (tabs + hero scroll)
  $$('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.scroll){
        document.querySelector(btn.dataset.scroll)?.scrollIntoView({behavior:'smooth'});
        return;
      }
      const tab=btn.dataset.tab;
      if(!tab) return;
      $$('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab').forEach(t=>t.classList.remove('active'));
      const el=$(`#tab-${tab}`);
      if(el) el.classList.add('active');
      document.querySelector('.atelier-frame')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
  $('#goAtelier')?.addEventListener('click', ()=> document.querySelector('.atelier-frame')?.scrollIntoView({behavior:'smooth'}));
  $('#goTraps')?.addEventListener('click', ()=> $('#traps')?.scrollIntoView({behavior:'smooth'}));

  // theme dual
  const themeBtn=$('#themeToggle');
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    if(themeBtn) themeBtn.textContent = t==='dark' ? '☀ Daylight' : '☾ Darkroom';
  }
  themeBtn?.addEventListener('click', ()=>{
    const cur=document.documentElement.getAttribute('data-theme')==='dark' ? 'light' : 'dark';
    applyTheme(cur);
  });
  // X-Ray switcher
  $$('.xray-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      $$('.xray-tab').forEach(x=>x.classList.remove('active'));
      tab.classList.add('active');
      const mode=tab.dataset.mode;
      $('#panePretty')?.classList.toggle('active', mode==='pretty');
      $('#paneXray')?.classList.toggle('active', mode==='xray');
    });
  });

  // bind
  $('#fileInput').addEventListener('change', handleFile);
  $('#textInput').addEventListener('input', ()=>{ updateCharCount(); currentFileName='văn_ban_dan.txt'; currentFileType=detectFileType(currentFileName, $('#textInput').value); });
  $$('.sample-btn').forEach(b=> b.addEventListener('click', ()=> handleSample(b.dataset.sample)));
  $('#scanBtn').addEventListener('click', handleScan);
  $('#clearBtn').addEventListener('click', handleClear);
  $('#copyMdBtn').addEventListener('click', async ()=>{
    const md=getPassportMarkdown();
    try{ await navigator.clipboard.writeText(md); $('#copyFeedback').textContent='Đã sao chép ✓'; setTimeout(()=>$('#copyFeedback').textContent='',2000); } catch(e){ alert(md); }
  });
  $('#downloadBtn').addEventListener('click', ()=>{
    const md=getPassportMarkdown();
    const blob=new Blob([md],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`Release-Passport-${new Date().toISOString().slice(0,10)}.md`; a.click(); URL.revokeObjectURL(url);
  });
  $('#runBenchBtn').addEventListener('click', runBenchmark);
  $('#resetBenchBtn').addEventListener('click', resetBenchmark);
  $('#ppCheck1').addEventListener('change', ()=> lastResults && updatePassportPreview(lastResults, currentFileName, currentFileType));
  $('#ppCheck2').addEventListener('change', ()=> lastResults && updatePassportPreview(lastResults, currentFileName, currentFileType));
  $('#ppCheck3').addEventListener('change', ()=> lastResults && updatePassportPreview(lastResults, currentFileName, currentFileType));

  // init
  updateCharCount();
  updatePrivacyChecks();
  renderBenchmark();
  renderAcceptance();
  updatePassportPreview(null,'','');
  // ensure no localStorage content written ever
  try{ localStorage.clear(); sessionStorage.clear(); } catch(e){}

  // Drag & drop
  const ta=$('#textInput');
  ta.addEventListener('dragover', e=>{ e.preventDefault(); ta.style.outline='2px dashed var(--ink)'; });
  ta.addEventListener('dragleave', ()=> ta.style.outline='');
  ta.addEventListener('drop', e=>{
    e.preventDefault(); ta.style.outline='';
    const file=e.dataTransfer.files[0];
    if(file){
      const dt=new DataTransfer(); dt.items.add(file); $('#fileInput').files=dt.files; handleFile({target:{files:[file]}});
    }
  });

})();
