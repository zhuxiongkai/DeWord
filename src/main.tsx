import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, CalendarCheck, BarChart3, Settings, XSquare, Volume2, Search, Target, Flame, Brain, CheckCircle2, HelpCircle, RotateCcw, Clock, Upload, Download, ChevronRight, Sparkles } from 'lucide-react';
import './styles.css';

type Grade = 'know' | 'fuzzy' | 'miss';
type Page = 'today' | 'review' | 'library' | 'mistakes' | 'stats' | 'settings';
type Word = { word: string; ipa: string; meaning: string; example: string; cn: string; etymology: string; ease: number; interval: number; due: number; mistakes: number; status: 'new' | 'learning' | 'mature' };

const DAY = 86_400_000;
const today = new Date(new Date().toDateString()).getTime();
const seed: Word[] = [
  { word: 'abandon', ipa: "/əˈbændən/", meaning: 'v. 放弃；抛弃；放纵', example: 'They had to abandon their plan due to the bad weather.', cn: '由于天气恶劣，他们不得不放弃他们的计划。', etymology: '来自古法语 abandoner，强调“交出去、不再控制”。', ease: 2.5, interval: 0, due: today, mistakes: 5, status: 'learning' },
  { word: 'allocate', ipa: "/ˈæləkeɪt/", meaning: 'v. 分配；划拨', example: 'The manager will allocate more time to retrieval practice.', cn: '经理会给主动回忆练习分配更多时间。', etymology: 'al- 加强 + loc 地点：放到某个位置。', ease: 2.4, interval: 1, due: today, mistakes: 4, status: 'learning' },
  { word: 'convey', ipa: "/kənˈveɪ/", meaning: 'v. 传达；运送', example: 'A vivid example can convey the meaning faster.', cn: '生动例句能更快传达含义。', etymology: 'con- 共同 + way 道路：一路带去。', ease: 2.35, interval: 3, due: today + DAY, mistakes: 3, status: 'learning' },
  { word: 'derive', ipa: "/dɪˈraɪv/", meaning: 'v. 得出；源自；获得', example: 'Efficient review schedules derive from memory research.', cn: '高效复习计划源于记忆研究。', etymology: 'de- 向下 + river 河流：从源头流出。', ease: 2.6, interval: 7, due: today - DAY, mistakes: 2, status: 'mature' },
  { word: 'implicit', ipa: "/ɪmˈplɪsɪt/", meaning: 'adj. 含蓄的；内含的', example: 'The implicit goal is to recall before seeing the answer.', cn: '隐含目标是在看答案前先回忆。', etymology: 'im- 里面 + plic 折叠：折在里面。', ease: 2.5, interval: 0, due: today, mistakes: 1, status: 'new' }
];

function schedule(word: Word, grade: Grade): Word {
  const factor = grade === 'know' ? 2.5 : grade === 'fuzzy' ? 1.35 : 0.45;
  const interval = grade === 'miss' ? 1 : Math.max(1, Math.round((word.interval || 1) * factor));
  return { ...word, ease: Math.max(1.3, word.ease + (grade === 'know' ? 0.12 : grade === 'fuzzy' ? -0.08 : -0.28)), interval, due: today + interval * DAY, mistakes: grade === 'miss' ? word.mistakes + 1 : word.mistakes, status: interval >= 15 ? 'mature' : 'learning' };
}

function App() {
  const [page, setPage] = useState<Page>('today');
  const [words, setWords] = useState(seed);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const due = useMemo(() => words.filter(w => w.due <= today), [words]);
  const current = due[idx % Math.max(due.length, 1)] ?? words[0];
  const learned = words.filter(w => w.status !== 'new').length;
  const reviewAccuracy = Math.round((words.reduce((s,w)=>s+w.ease,0) / (words.length * 2.8)) * 100);
  const grade = (g: Grade) => { setWords(ws => ws.map(w => w.word === current.word ? schedule(w, g) : w)); setRevealed(false); setIdx(i => Math.min(i, Math.max(due.length - 2, 0))); };
  return <div className="app"><aside><h1>DeWord</h1><p>高效私人背词</p>{nav.map(n => <button key={n.id} onClick={()=>setPage(n.id)} className={page===n.id?'active':''}><n.icon size={22}/>{n.label}</button>)}<div className="method"><Sparkles size={18}/> 间隔重复 · 主动回忆 · 交错练习</div></aside><main><Top />{page==='today' && <Today current={current} revealed={revealed} setRevealed={setRevealed} grade={grade} idx={idx} total={due.length} learned={learned} />}{page==='review' && <Review words={words}/>} {page==='library' && <Library />} {page==='mistakes' && <Mistakes words={words}/>} {page==='stats' && <Stats learned={learned} accuracy={reviewAccuracy}/>} {page==='settings' && <SettingsPage />}</main></div>;
}
const nav = [{id:'today' as Page,label:'今日单词',icon:BookOpen},{id:'review' as Page,label:'复习计划',icon:CalendarCheck},{id:'library' as Page,label:'词库',icon:Brain},{id:'mistakes' as Page,label:'错词本',icon:XSquare},{id:'stats' as Page,label:'学习统计',icon:BarChart3},{id:'settings' as Page,label:'设置',icon:Settings}];
function Top(){return <header><div className="search"><Search size={20}/>搜索单词或中文意思<span>Ctrl + K</span></div><div className="win">— □ ×</div></header>}
function Today({current,revealed,setRevealed,grade,idx,total,learned}:{current:Word;revealed:boolean;setRevealed:(v:boolean)=>void;grade:(g:Grade)=>void;idx:number;total:number;learned:number}){return <section className="grid"><div className="card hero"><h2>{current.word}</h2><div className="ipa">{current.ipa}<button><Volume2/></button></div><p className="meaning">{revealed ? current.meaning : '先在脑中主动回忆释义，再按 Enter 查看答案'}</p><hr/><Info tag="例句" text={revealed ? current.example : '隐藏例句，避免被动熟悉感'} sub={revealed ? current.cn : '主动回忆比反复看释义更能巩固长期记忆。'}/><Info tag="词源" text={revealed ? current.etymology : '答题后显示词源，帮助建立语义钩子'} /><div className="actions">{!revealed ? <button className="primary" onClick={()=>setRevealed(true)}>查看释义 / Enter</button> : <><button className="know" onClick={()=>grade('know')}>认识 1</button><button className="fuzzy" onClick={()=>grade('fuzzy')}>模糊 2</button><button className="miss" onClick={()=>grade('miss')}>不认识 3</button></>}</div><div className="pager">{Math.min(idx+1,total)} / {total || 1}</div></div><Right learned={learned} total={20} due={total}/></section>}
function Info({tag,text,sub}:{tag:string;text:string;sub?:string}){return <div className="info"><b>{tag}</b><div>{text}<small>{sub}</small></div></div>}
function Right({learned,total,due}:{learned:number;total:number;due:number}){return <div className="side"><Panel title="今日进度"><div className="ring">{learned}<small>/ {total}</small></div><p>待复习 {due} · 新学 12</p></Panel><Panel title="连续学习"><Flame color="#ff8a00"/> <strong>7 天</strong><p>短时多次，比一次刷很久更稳。</p></Panel><Panel title="记忆曲线"><div className="curve"><i/><i/><i/><i/><i/></div><p>1天、3天、7天、15天、30天自动安排。</p></Panel><Panel title="复习提醒"><Clock/> 建议 19:00 前完成</Panel></div>}
function Panel(p:{title:string;children:React.ReactNode}){return <div className="panel"><h3>{p.title}</h3>{p.children}</div>}
function Review({words}:{words:Word[]}){const due=words.filter(w=>w.due<=today).length;return <section><h2>复习计划</h2><div className="wide"><h3>今日复习任务</h3><StatsRow items={[['待复习单词',due],['新增单词',12],['预计用时','25 分钟']]}/><button className="primary">开始复习</button></div><div className="wide"><h3>间隔复习安排</h3><div className="chips">{[[1,18],[3,22],[7,15],[15,9],[30,6]].map(x=><span key={x[0]}>{x[0]} 天后<b>{x[1]} 词</b></span>)}</div></div></section>}
function Library(){return <section><h2>词库管理</h2><div className="toolbar"><input placeholder="搜索词库名称"/><button><Upload size={18}/>导入词库</button></div>{['四级核心词汇','六级词汇','考研词汇','雅思词汇','自定义词库'].map((n,i)=><div className="row" key={n}><BookOpen/> <b>{n}</b><span>{[4512,6218,5576,3254,1238][i]} 词</span><progress value={[27,14,34,20,10][i]} max="100"/><button>{i===0?'继续学习':'进入学习'}</button></div>)}</section>}
function Mistakes({words}:{words:Word[]}){return <section><h2>错词本</h2>{words.filter(w=>w.mistakes>1).map(w=><div className="row" key={w.word}><b>{w.word}</b><span>{w.ipa}</span><span>{w.meaning}</span><em>{w.mistakes} 次</em><button><RotateCcw size={16}/>重新学习</button></div>)}</section>}
function Stats({learned,accuracy}:{learned:number;accuracy:number}){return <section><h2>学习统计</h2><div className="cards"><Panel title="总共已学"><strong>{learned.toLocaleString()} 个</strong></Panel><Panel title="复习正确率"><strong>{accuracy}%</strong></Panel><Panel title="连续学习"><strong>7 天</strong></Panel></div><div className="chart">{[12,18,24,15,10,14,12].map((h,i)=><span style={{height:h*6}} key={i}>{h}</span>)}</div></section>}
function SettingsPage(){return <section><h2>设置</h2><div className="settings"><Panel title="学习提醒"><label><input type="checkbox" defaultChecked/> 每日 19:00 桌面通知</label></Panel><Panel title="快捷键"><p>空格：下一个 · 1/2/3：评分 · Enter：查看释义</p></Panel><Panel title="每日目标"><p>新词 12 个 · 复习 20 个</p></Panel><Panel title="数据"><button><Download size={16}/>导出 JSON</button></Panel></div></section>}
function StatsRow({items}:{items:[string,string|number][]}){return <div className="statsrow">{items.map(i=><span key={i[0]}>{i[0]}<b>{i[1]}</b></span>)}</div>}

createRoot(document.getElementById('root')!).render(<App />);
