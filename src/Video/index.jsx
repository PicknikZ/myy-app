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
      pidMap: {1: 122},
      outputMap: {},
      statusMap: {}
    };
  }

  componentDidMount() {
    this.checkProcess(this.state.step)
  }


 checkProcess = (step) => {
    const params = parseParam(window.location.hash);
    if (params['uid'] && this.state.pidMap[step]) {
     fetch(`http://127.0.0.1:8080/getProgress?uid=${params['uid']}&pid=${this.state.pidMap[step]}&output=${this.state.outputMap[step]}`)
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
          if (response.status === 'running') {
            console.log('running')
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
              this.checkProcess(step);
            }, 5000);
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
    const formData = new FormData();
    if (!this.state.data[step]) {
      console.log('没选择数据')
      return
    }
    const uid = params['uid'];
    const value = this.state.data[step];
    fetch(`http://127.0.0.1:8080/changeVideoPixelFormat?uid=${uid}&value=${value}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
       console.log('response.json()', response.json())
    })
    .then(data => {
      console.log(data); // 处理响应数据
      
    })
    .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
    });
  }

  onChange=(v, step) => {
    const data = {...this.state.data};
    data[step] = v
    this.setState({data: data})
  }

  nextStep = () => {
    if (this.state.step === 6) {
      return
    }
    this.setState({step: this.state.step + 1})
  }

  preStep = () => {
    if (this.state.step === 1) {
      return
    }
    this.setState({step: this.state.step - 1})
  }

  getCurrentStep = () => {
    switch (this.state.step) {
      case 1:
        return <div style={{display: 'block'}}>
        <div>1. Convert Video Pixel Format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Pixel Format' size="large" style={{width: '300px'}} onChange={(v)=>this.onChange(v, '1')}>
              <Option value="420">YUV 4:2:0</Option>
              <Option value="422">YUV 4:2:2</Option>
              <Option value="444">YUV 4:4:4</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={(v)=>this.handleClick(v, '1')}>Extract video</Button></div>
            {this.state.statusMap['1'] ? this.state.statusMap['1'] === 'running' ? <div style={{marginTop: '50px'}}>Extracting, Please Wait...</div> : this.state.statusMap['1'] === 'done' ? <div style={{marginTop: '50px'}}><Button>Download Video</Button></div> : null : null}
        </div>
      case 2:
        return <div style={{display: 'block'}}>
        <div>2. Convert Video Format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Format' size="large" style={{width: '300px'}} onSelect={(v)=> console.log(v)}>
              <Option value="mp4">mp4</Option>
              <Option value="avi">avi</Option>
              <Option value="mkv">mkv</Option>
              <Option value="mov">mov</Option>
              <Option value="webm">webm</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button></div>
        </div>
      case 3:
        return <div style={{display: 'block'}}>
        <div>3. Convert video bitrate</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Bitrate' size="large" style={{width: '300px'}}>
              <Option value="500k">500k</Option>
              <Option value="750k">750k</Option>
              <Option value="1000k">1000k</Option>
              <Option value="2000k">2000k</Option>
              <Option value="3000k">3000k</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button></div>
        </div>
      case 4: 
        return <div style={{display: 'block'}}>
        <div>4. Convert video frame rate</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Frame Rate' size="large" style={{width: '300px'}}>
              <Option value="30">30</Option>
              <Option value="60">60</Option>
              <Option value="90">90</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button></div>
        </div>
      case 5:
        return <div style={{display: 'block'}}>
          <div>5. Convert video format</div>
            <div style={{display: 'flex', marginTop: '50px'}}>
              <Select placeholder='Please Select Video Resolution' size="large" style={{width: '300px'}}>
                <Option value="640x360">640x360</Option>
                <Option value="1280x720">1280x720</Option>
                <Option value="1920x1080">1920x1080</Option>
                <Option value="3840x2160">3840x2160</Option>
              </Select>
              <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button></div>
          </div>
      case 6:
        return <div style={{display: 'block'}}>
        <div>6. Convert video encoding format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Video Encoding Format' size="large" style={{width: '300px'}}>
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
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button></div>
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
            {this.state.step > 1 ? <Link onClick={this.preStep}>Pre Step</Link> : null}
            {this.state.step < 6 ? <Link onClick={this.nextStep}>Next Step</Link> : null}
            </div>
      </div>
    );
  }
}

export default Video;
