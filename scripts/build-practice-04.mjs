import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = '526b4c6c7f3932132a71e85bc2f651bd/index.html';
const outputPath = 'd5d87362691f486e9b798966cf29e64f/index.html';
const template = await readFile(path.join(root, templatePath), 'utf8');
const source = JSON.parse(await readFile(path.join(root, 'scripts/practice-test-04.source.json'), 'utf8'));
const appMatch = template.match(/const APP = (.*);\r?\n/);
if (!appMatch) throw new Error('Practice 3 application data missing');
const app = JSON.parse(appMatch[1]);
app.course.expected = { testCount: 4, questionTotal: 400 };
app.test = {
  schemaVersion: 2, sequence: 4, testId: 'luyen-de-practice-test-04',
  testLabel: 'PRACTICE TEST 4', testNumber: 4, testCode: 'LD-PT04',
  title: 'PRACTICE TEST 4', topic: 'ÔN THI CHUYÊN ANH', total: 100,
  questionDocumentId: source.docId, questionTab: source.sourceTabs.test.tabId,
  sections: source.sections,
  answers: source.answers.map(({globalNumber,sectionCode,localNumber,acceptedAnswers,displayAnswer,explanation}) =>
    ({globalNumber,sectionCode,localNumber,acceptedAnswers,displayAnswer,explanation})),
  publishReady: true
};
let html = template.replace(appMatch[0], () => `const APP = ${JSON.stringify(app)};\n`);
html = html.replace('<title>Phiếu trả lời</title>', '<title>PRACTICE TEST 4 · LUYỆN ĐỀ</title>');
html = html.replace('Nhập dạng: Line 1: Spread → Spreading', 'Nhập từ sai → từ đúng (hoặc dùng ->). Điền 5 lỗi khác nhau, không cần theo thứ tự xuất hiện.');
// This source asks for five errors without numbered lines: score each distinct
// correction once, in any order, and show an unfound correction for each miss.
const start = html.indexOf('    function buildReview(answerSnapshot){');
const end = html.indexOf('    function renderWrongList(review){', start);
if (start < 0 || end < 0) throw new Error('Practice 3 grading boundaries changed');
html = html.slice(0,start) + `    function buildReview(answerSnapshot){
      const errorSolutions = SOLUTIONS.filter(solution => solution.sectionCode === "I.3");
      const errorMatches = new Map();
      const usedErrors = new Set();
      errorSolutions.forEach(slot => {
        const submitted = String(answerSnapshot[slot.globalNumber] || "").trim();
        const match = errorSolutions.find(candidate => !usedErrors.has(candidate.globalNumber) && candidate.acceptedAnswers.some(answer => equivalent(answer,submitted)));
        if(match){ errorMatches.set(slot.globalNumber,match); usedErrors.add(match.globalNumber); }
      });
      const remainingErrors = errorSolutions.filter(solution => !usedErrors.has(solution.globalNumber));
      let score = 0;
      const review = questions.map(globalNumber => {
        let solution = solutionByGlobal.get(globalNumber);
        const submitted = String(answerSnapshot[globalNumber] || "").trim();
        let correct;
        if(solution?.sectionCode === "I.3"){
          correct = errorMatches.has(globalNumber);
          solution = errorMatches.get(globalNumber) || remainingErrors.shift();
        }else{
          correct = Boolean(solution) && solution.acceptedAnswers.some(answer => equivalent(answer,submitted));
        }
        if(correct) score++;
        return {...solution,globalNumber,submitted,correct};
      });
      const wrongNumbers = review.filter(item => !item.correct).map(item => item.globalNumber);
      return {score,review,percent:Math.round(score / TOTAL * 100),wrong:wrongNumbers.length,wrongNumbers};
    }

` + html.slice(end);
await mkdir(path.dirname(path.join(root, outputPath)), {recursive:true});
await writeFile(path.join(root, outputPath), html);
console.log(outputPath);
