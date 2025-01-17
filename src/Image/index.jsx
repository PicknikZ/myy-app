import React from 'react';
import { Upload, Button, Select } from '@alifd/next';
import { Link } from 'react-router-dom';

function parseParam(str, isDecode) {
  str = str || window.location.search;
  isDecode = isDecode === undefined ? true : isDecode;
  const ary = str.split(/[?&]/),
    result = {};
  for (let i = 0, j = ary.length; i < j; i++) {
    const n = ary[i];
    if (!n) continue;
    const tmp = n.split('=');
    result[tmp[0]] = isDecode && !!tmp[1] ? decodeURIComponent(tmp[1]) : tmp[1];
  }
  return result;
}

const Option = Select.Option;
class Image extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'image',
      step: 1,
      data: {},
      statusMap: {},
    };
    this.urlMap = {
      1: 'changeImagePixelFormat',
      2: 'convertImageFormat',
      3: 'changeImageResolution',
      4: 'mergeImageToVideo',
    };
    this.valueMap={
      1: '420',
      2: 'mp4',
      3: '500k',
      4: '30',
      5: '640x360',
      6: 'libx264',
    }
  }

  componentDidMount() {
    this.checkProcess(this.state.step)
  }


 checkProcess = (step, value=null) => {
    const params = parseParam(window.location.hash);
    const filename = params['filename']
    const v = value ? value : this.state.data[step]
    
    if (params['uid']) {
     fetch(`http://127.0.0.1:8080/getImageProgress?uid=${params['uid']}&filename=${filename}&step=${step}&value=${v}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json()
      })
      .then(response => {
        console.log('response', response)
        if (response.code === 0) {
          const statusMap = {...this.state.statusMap}
          statusMap[step] = response.status
          this.setState({statusMap: statusMap})
          if (response.status === 'running' || response.status === 'wait') {
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
              this.checkProcess(step, value);
            }, 3000);
          }
          }else {
            clearTimeout(this.timeoutId);
          }
      })
      .catch(error => {
        console.error('There has been a problem with your fetch operation:', error);
      });
    }
  }

  handleChange = (v) => {
    this.setState({ mode: v });
  }

  handleClick = (v, step) => {
    const params = parseParam(window.location.hash);
    console.log('params', params)
    if (!params['uid']) {
      window.location.href = '/'
    }
    if (!this.state.data[step]) {
      console.log('没选择数据')
      return
    }
    const uid = params['uid'];
    const filename = params['filename']
    const value = this.state.data[step];
    fetch(`http://127.0.0.1:8080/${this.urlMap[step]}?uid=${uid}&value=${value}&filename=${filename}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json()
    })
    .then(data => {
      console.log(data); // 处理响应数据
      if (data['output']) {
        this.checkProcess(this.state.step)
      }
    })
    .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
    });
  }

  onChange=(v, step) => {
    this.setState({value: v})
    const data = {...this.state.data};
    data[step] = v
    this.setState({data: data})
    clearTimeout(this.timeoutId);
    this.checkProcess(step, v)
  }

  nextStep = () => {
    if (this.state.step === 4) {
      return
    }
    this.setState({value: null})
    this.setState({step: this.state.step + 1})
  }

  preStep = () => {
    if (this.state.step === 1) {
      return
    }
    this.setState({value: null})
    this.setState({step: this.state.step - 1})
  }

  downloadVideo = (step) => {
    const params = parseParam(window.location.hash);
    const uid = params['uid']
    const filename = params['filename']
    const value = this.state.data[step]

    fetch(`http://127.0.0.1:8080/downloadImage?uid=${uid}&step=${step}&filename=${filename}&value=${value}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      let suffix = ""
      for (let [key, value] of response.headers.entries()) {
        if (key.toLowerCase() === "filesuffix") {
          suffix = value
        }
      }
      return response.blob().then(blob => ({ blob, suffix }))
    })
    .then(({ blob, suffix }) => {
      const url = window.URL.createObjectURL(blob);
      // 创建一个<a>标签并模拟点击它
      const a = document.createElement('a');
      a.href = url;
      const params = parseParam(window.location.hash);
      const filename = params['filename']
      const names = filename.split('.')
      if (step === 2) { 
        a.download = `${names[0]}${step}-${this.state.data[step]}.${this.state.data[2]}`
      }else if (step === 4){
        a.download = `${names[0]}${step}-${this.state.data[step]}.mp4`
      }else {
        a.download = `${names[0]}${step}-${this.state.data[step]}.${suffix}`
      }
      
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
    });
  }

  getCurrentStep = () => {
    switch (this.state.step) {
      case 1:
        return <div style={{display: 'block'}}>
        <div>1. Change image pixel format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Image Pixel Format' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 1)}>
              <Option value="420">YUV 4:2:0</Option>
              <Option value="422">YUV 4:2:2</Option>
              <Option value="444">YUV 4:4:4</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 1)}>Extract image</Button></div>
            {this.state.statusMap[1] ? this.state.statusMap[1] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[1] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(1)}>Download Image</Button></div> : null : null}
        </div>
      case 2:
        return <div style={{display: 'block'}}>
        <div>2. Convert image format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Image Format' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 2)}>
            <Option value="bmp">bmp</Option>
              <Option value="jpg">jpg</Option>
              <Option value="png">png</Option>
              <Option value="gif">gif</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} }  onClick={(v)=>this.handleClick(v, 2)}>Extract image</Button></div>
            {this.state.statusMap[2] ? this.state.statusMap[2] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[2] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(2)}>Download Image</Button></div> : null : null}
        </div>
      case 3:
        return <div style={{display: 'block'}}>
          <div>3. Convert image format</div>
            <div style={{display: 'flex', marginTop: '50px'}}>
              <Select placeholder='Please Select Video Resolution' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 3)}>
                <Option value="640x360">640x360</Option>
                <Option value="1280x720">1280x720</Option>
                <Option value="1920x1080">1920x1080</Option>
              </Select>
              <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 3)}>Extract image</Button></div>
            {this.state.statusMap[3] ? this.state.statusMap[3] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[3] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(3)}>Download Image</Button></div> : null : null}
          </div>
      case 4:
        return <div style={{display: 'block'}}>
        <div>4. Merge images into video</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Duration (Second)' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 4)}>
              <Option value="3">3</Option>
              <Option value="5">5</Option>
              <Option value="10">10</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 4)}>merge to video</Button></div>
            {this.state.statusMap[4] ? this.state.statusMap[4] === 'running' ? <div style={{marginTop: '50px'}}>Merging, Please Wait...</div> : this.state.statusMap[4] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(4)}>Download Video</Button></div> : null : null}
        </div>
    }
  }

  render() {
    return (
      <div >
        <div><Upload
            limit={1}
            listType="text"></Upload>
          </div>
          <div style={{display: 'block'}}>
          <div>
            {this.getCurrentStep()}
          </div>
          </div>
          <div style={{marginTop: '50px', display: 'flex', justifyContent: "space-around"}}>
            {this.state.step > 1 ? <Button type='primary' text size='large' onClick={this.preStep}>Pre Step</Button> : null}
            {this.state.step < 4 ? <Button type='primary' text size='large' onClick={this.nextStep}>Next Step</Button> : null}
            </div>
      </div>
    );
  }
}

export default Image;
