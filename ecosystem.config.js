module.exports = {
  apps: [
    {
      name: 'janapriya-api',
      cmd: 'uvicorn',
      args: 'backend.app.main:app --host 0.0.0.0 --port 8000',
      cwd: '/home/jpuser/projects/janapriyaupscale',
      interpreter: '/home/jpuser/projects/janapriyaupscale/.venv/bin/python',
      env: { PYTHONPATH: '/home/jpuser/projects/janapriyaupscale' },
    },
    {
      name: 'janapriya-web',
      script: 'npm',
      args: 'run dev -- --port 3000 -H 0.0.0.0',
      cwd: '/home/jpuser/projects/janapriyaupscale/frontend',
    }
  ]
}
