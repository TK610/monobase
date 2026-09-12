(() => {
  'use strict';
  const questions = [...document.querySelectorAll('.vc-question')];
  const state = new Map();
  const aoi = 'images/learning/characters/course/aoi-happy.webp';
  const teacher = 'images/learning/characters/course/teacher-encourage.webp';
  function progress() { document.getElementById('quiz-progress').textContent = `回答済み ${state.size} / ${questions.length}問`; }
  questions.forEach((q, index) => {
    q.addEventListener('change', () => { state.delete(q.id); q.querySelector('.vc-feedback').hidden = true; q.querySelector('.vc-prompt').textContent = ''; q.querySelectorAll('.vc-option').forEach(x=>x.classList.remove('is-selected')); document.getElementById('quiz-score').textContent = ''; progress(); });
    q.querySelector('.vc-check').addEventListener('click', () => {
      const selected = q.querySelector('input:checked');
      if (!selected) { q.querySelector('.vc-prompt').textContent = '答えを一つ選んでください。'; return; }
      const correct = selected.value === q.dataset.answer;
      state.set(q.id, correct); progress();
      q.querySelector('.vc-prompt').textContent = '';
      q.querySelectorAll('.vc-option').forEach(x=>x.classList.remove('is-selected'));
      selected.closest('label').classList.add('is-selected');
      const feedback = q.querySelector('.vc-feedback');
      feedback.hidden = false; feedback.classList.toggle('is-correct', correct);
      const img = feedback.querySelector('img'); img.src = correct ? aoi : teacher; img.alt = correct ? '正解を喜ぶ葵' : '励ますけー子ちゃん先生';
      feedback.querySelector('strong').textContent = correct ? ['葵：やった！ 正解！','葵：その理由で合ってるね！'][index % 2] : 'けー子ちゃん先生：大丈夫。理由を一緒に振り返りましょう。';
      document.getElementById('quiz-score').textContent = '';
    });
  });
  document.getElementById('show-score').addEventListener('click', () => {
    const score = document.getElementById('quiz-score'); score.replaceChildren();
    const line = document.createElement('p');
    line.textContent = state.size < questions.length ? `あと${questions.length-state.size}問です。未回答の問題にも取り組んでみましょう。` : `10問中 ${[...state.values()].filter(Boolean).length}問正解。解説を読んで理由を確認できれば大丈夫です。`;
    score.append(line);
    const remaining = questions.filter(q => state.get(q.id) !== true);
    if (remaining.length) { const list=document.createElement('ul'); remaining.forEach(q=>{const li=document.createElement('li'),a=document.createElement('a');a.href='#'+q.id;a.textContent=`問${q.id.slice(1)}を${state.has(q.id)?'振り返る':'解く'}`;li.append(a);list.append(li);});score.append(list); }
    else { const p=document.createElement('p'); p.textContent='全問正解！ 真空をつくる・測る・保つ・使う、のつながりをつかめました。';score.append(p); }
    score.focus();
  });
  document.getElementById('reset-quiz').addEventListener('click', () => {
    state.clear(); questions.forEach(q=>{q.querySelectorAll('input').forEach(i=>i.checked=false);q.querySelector('.vc-feedback').hidden=true;q.querySelector('.vc-prompt').textContent='';q.querySelector('.vc-answer').open=false;q.querySelectorAll('.vc-option').forEach(x=>x.classList.remove('is-selected'));});
    progress(); document.getElementById('quiz-score').textContent='回答をリセットしました。'; questions[0].querySelector('input').focus();
  });
})();