// framework

const template =
  (id, ...names) =>
  (...args) => {
    let html = document.getElementById(`${id}-template`).innerHTML
    names.forEach((name, i) => (html = html.replace(new RegExp(`\\\${${name}}`, 'g'), args[i])))
    return html
  }

const view = (id, args = {}) => {
  const keys = Object.keys(args)
  const vals = keys.map(key => args[key])
  document.getElementById(args.on || 'app').innerHTML = template(id, ...keys)(...vals)
  const title = document.getElementById(`${id}-template`).attributes.title
  ;(args.title || title) && (document.title = args.title || title.value)
  feather.replace()
}

const API_SERVER = 'https://sweet-moth-32.deno.dev'

const api = async (endpoint, data = {}) => {
  return await (await fetch(`${API_SERVER}/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })).json()
}

// app

window.results = async () => {
  const { data, error } = await api('results', { username: window.data.username })
  if (error) {
    return
  }
  document.getElementById('tests-link').attributes.class.value = 'nav-link'
  document.getElementById('results-link').attributes.class.value = 'nav-link active'
  view('results', { on: 'test-content' })
  document.getElementById('results-table').innerHTML = data
    .map(
      e =>
        `<td>${e.title}</td>
<td>${e.username}</td>
<td>${new Date(e.start).toISOString().split('T')[0]}</td>
<td>${Math.round((e.end - e.start) / 1000 / 60)} мин.</td>
<td>-</td>
<td>-</td>`,
    )
    .join('')
}

window.logout = () => {
  clearInterval(window.watcher)
  delete window.data
  localStorage.removeItem('username')
  view('login')
}

window.start = async username => {
  if (!username) {
    username = document.getElementById('login-username').value
    if (!username) {
      document.getElementById('login-username').reportValidity()
      return
    }
    localStorage.setItem('username', username)
  }

  const data = await api('start', { username })
  if (data.error) {
    window.logout()
    return
  }
  data.username = username
  data.start = +new Date()
  data.questions.forEach(q => (q.selected = {}))

  view('test', { username: data.username, title: data.title })
  view('test-content', { on: 'test-content' })
  data.admin && (document.getElementById('results-link').attributes.class.value = 'nav-link')
  document.getElementById('test-title').innerText = data.testName
  document.getElementById('test-questions').innerHTML = data.questions
    .map((q, i) => template('test-question', 'question', 'answers')(q.question, q.answers.map((a, j) => template('test-answer', 'i', 'j', 'a', 'type')(i, j, a, q.type)).join('')))
    .join('')

  data.stats = { focus: {}, width: {}, height: {}, samples: 0 }
  window.watcher = setInterval(() => {
    const width = Math.round((window.innerWidth / window.screen.width) * 10) / 10
    const height = Math.round((window.innerHeight / window.screen.height) * 10) / 10
    const focus = document.hasFocus()
    ++data.stats.samples
    data.stats.width[width] = data.stats.width[width] || 0
    ++data.stats.width[width]
    data.stats.height[height] = data.stats.height[height] || 0
    ++data.stats.height[height]
    data.stats.focus[focus] = data.stats.focus[focus] || 0
    ++data.stats.focus[focus]
  }, 1000)

  window.data = data
}

window.select = (i, j, type) => {
  const data = window.data
  if (type === 'radio') {
    data.questions[i].selected = {}
    data.questions[i].selected[j] = true
  } else {
    data.questions[i].selected = data.questions[i].selected || {}
    data.questions[i].selected[j] ? delete data.questions[i].selected[j] : (data.questions[i].selected[j] = true)
  }
}

window.finish = async () => {
  const data = window.data
  data.questions.forEach(q => (q.selected = Object.keys(q.selected).map(Number)))
  data.end = +new Date()
  await api('finish', { data })

  view('test', { username: data.username })
  view('test-done', { on: 'test-content' })
  data.admin && (document.getElementById('results-link').attributes.class.value = 'nav-link')

  clearInterval(window.watcher)
  // delete window.data
}

localStorage.getItem('username') ? start(localStorage.getItem('username')) : view('login')
