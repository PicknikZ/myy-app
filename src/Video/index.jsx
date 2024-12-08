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
class Video extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'video',
      step: 1,
      data: {},
      statusMap: {},
    };
    this.urlMap = {
      1: 'changeVideoPixelFormat',
      2: 'convertVideoFormat',
      3: 'transcodeVideoBitrate',
      4: 'convertVideoFrameRate',
      5: 'changeVideoResolution',
      6: 'changeVideoCodecFormat',
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


 checkProcess = (step, suffix=null) => {
    console.log('suffix', suffix)
    const params = parseParam(window.location.hash);
    const filename = params['filename']
    const names = filename.split('.')
    if (names.length != 2) {
      return
    }
    let output;
    if (step === 2) {
      if (suffix !== null) {
        output = `output${step}.${suffix}`
      }else {
        output = `output${step}.${this.state.data[step]}`
      }
    } else {
      output = `output${step}.${names[1]}`
    }
    console.log('output', output)
    if (params['uid']) {
     fetch(`http://127.0.0.1:8080/getProgress?uid=${params['uid']}&filename=${output}&step=${step}`)
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
              this.checkProcess(step, suffix);
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
    if (step === 2) {
      clearTimeout(this.timeoutId);
      this.checkProcess(step, v)
    } else {
      clearTimeout(this.timeoutId);
      this.checkProcess(step)
    }
    
  }

  nextStep = () => {
    if (this.state.step === 6) {
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
    const names = filename.split('.')
    if (names.length !== 2) {
      return
    }
    let output
    if (step === 2) {
      output = `${output}${step}.${this.state.data[step]}`
    } else {
      output = `${output}${step}.${names[1]}`
    }

    fetch(`http://127.0.0.1:8080/downloadVideo?uid=${uid}&step=${step}&filename=${output}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.blob()
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      // 创建一个<a>标签并模拟点击它
      const a = document.createElement('a');
      a.href = url;
      const params = parseParam(window.location.hash);
      const filename = params['filename']
      const names = filename.split('.')
      if (step === 2) { 
        a.download = `${names[0]}_${step}.${this.state.data[2]}`
      }else {
        a.download = `${names[0]}_${step}.${names[1]}`
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
        <div>1. Convert Video Pixel Format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Pixel Format' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 1)}>
              <Option value="420">YUV 4:2:0</Option>
              <Option value="422">YUV 4:2:2</Option>
              <Option value="444">YUV 4:4:4</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 1)}>Extract video</Button></div>
            {this.state.statusMap[1] ? this.state.statusMap[1] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[1] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(1)}>Download Video</Button></div> : null : null}
        </div>
      case 2:
        return <div style={{display: 'block'}}>
        <div>2. Convert Video Format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Format' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 2)}>
              <Option value="mp4">mp4</Option>
              <Option value="avi">avi</Option>
              <Option value="mkv">mkv</Option>
              <Option value="mov">mov</Option>
              <Option value="webm">webm</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} }  onClick={(v)=>this.handleClick(v, 2)}>Extract video</Button></div>
            {this.state.statusMap[2] ? this.state.statusMap[2] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[2] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(2)}>Download Video</Button></div> : null : null}
        </div>
      case 3:
        return <div style={{display: 'block'}}>
        <div>3. Convert video bitrate</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Bitrate' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 3)}>
              <Option value="500k">500k</Option>
              <Option value="750k">750k</Option>
              <Option value="1000k">1000k</Option>
              <Option value="2000k">2000k</Option>
              <Option value="3000k">3000k</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 3)}>Extract video</Button></div>
            {this.state.statusMap[3] ? this.state.statusMap[3] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[3] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(3)}>Download Video</Button></div> : null : null}
        </div>
      case 4: 
        return <div style={{display: 'block'}}>
        <div>4. Convert video frame rate</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Frame Rate' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 4)}>
              <Option value="30">30</Option>
              <Option value="60">60</Option>
              <Option value="90">90</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 4)}>Extract video</Button></div>
            {this.state.statusMap[4] ? this.state.statusMap[4] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[4] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(4)}>Download Video</Button></div> : null : null}
        </div>
      case 5:
        return <div style={{display: 'block'}}>
          <div>5. Convert video format</div>
            <div style={{display: 'flex', marginTop: '50px'}}>
              <Select placeholder='Please Select Video Resolution' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 5)}>
                <Option value="640x360">640x360</Option>
                <Option value="1280x720">1280x720</Option>
                <Option value="1920x1080">1920x1080</Option>
                <Option value="3840x2160">3840x2160</Option>
              </Select>
              <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 5)}>Extract video</Button></div>
            {this.state.statusMap[5] ? this.state.statusMap[5] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[5] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(5)}>Download Video</Button></div> : null : null}
          </div>
      case 6:
        return <div style={{display: 'block'}}>
        <div>6. Convert video encoding format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Encoding Format' value={this.state.value} size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, 6)}>
              <Option value="libx264">H.264</Option>
              <Option value="libx265">H.265</Option>
              <Option value="libvpx-vp9">VP9</Option>
              <Option value="libaom-av1">AV1</Option>
              <Option value="libtheora">Theora</Option>
              {/* <Option value="444">VP9</Option>
              <Option value="444">AV1</Option>
              <Option value="444">MJPEG</Option>
              <Option value="444">ProRes</Option>
              <Option value="444">Theora</Option>
              <Option value="444">Xvid</Option>
              <Option value="444">WMV</Option> */}
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, 6)}>Extract video</Button></div>
            {this.state.statusMap[6] ? this.state.statusMap[6] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap[6] === 'done' ? <div style={{marginTop: '50px'}}><Button onClick={() => this.downloadVideo(6)}>Download Video</Button></div> : null : null}
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
            {this.state.step < 6 ? <Button type='primary' text size='large' onClick={this.nextStep}>Next Step</Button> : null}
            </div>
      </div>
    );
  }
}

export default Video;
