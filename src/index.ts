import * as core from "@actions/core";
import archiver from 'archiver';
import fs from 'fs';
import fetch, { File, FormData } from 'node-fetch';
// import FormData from 'form-data';

// 部署项目

// project_id && token
const projectId = core.getInput('id');
const token = core.getInput('token');
const path = core.getInput('path');
const server = core.getInput('server');

if (!projectId || !token) {
  console.error('请配置 PROJECT_ID 和 TOKEN');
  core.setFailed('请配置 PROJECT_ID 和 TOKEN');
  process.exit(1);
}

function uploadFile() {
  // 是否存在dist.zip
  if (!fs.existsSync('dist.zip')) {
    console.error('dist.zip不存在');
    core.setFailed('dist.zip不存在');
    process.exit(1);
  }
  // 读入文件
  const file = new File([fs.readFileSync('dist.zip')], 'dist.zip');
  // 上传文件
  const url = server;
  // 构建form-data
  const formData = new FormData();
  formData.set('projectId', projectId);
  formData.set('token', token);
  formData.set('upload', file);
  // 发送fetch请求
  type DeployResp = {
    code: number;
    msg: string;
  };
  fetch(url, {
    method: 'POST',
    body: formData,
  })
    .then((res) => res.json() as Promise<DeployResp>)
    .then((res) => {
      if (res.code === 200) {
        console.log('部署成功');
      } else {
        console.error(res.msg);
        core.setFailed(res.msg);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(err);
      core.setFailed(err);
      throw err;
    })
    .finally(() => {
      // 删除dist.zip
      fs.unlinkSync('dist.zip');
    })
}

// 压缩dist目录
const archive = archiver('zip', {
  zlib: { level: 9 },
});

const output = fs.createWriteStream('dist.zip');
output.on('close', () => {
  // 上传文件
  uploadFile();
});

archive.on('error', (err) => {
  core.error(err);
  throw err;
});

archive.pipe(output);
archive.directory(path, false);
archive.finalize();
