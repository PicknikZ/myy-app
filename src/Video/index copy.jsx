import React from 'react';
import { Upload, Button, Select } from '@alifd/next';
const Option = Select.Option;
class Video extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'video',
    };
  }

  handleChange = (v) => {
    this.setState({ mode: v });
  }

  handleClick = (v) => {

  }

  render() {
    return (
      <div >
        <div><Upload
            limit={1}
            listType="text"></Upload>
          </div>
          <div style={{display: 'block'}}>
          <div style={{display: 'flex', marginTop: '20px'}}>
            <Select placeholder='Please Select Video Pixel Format' size="large" style={{width: '300px'}} dataSource={[{label: "YUV 4:2:0", value:"420"}, {label: "YUV 4:2:2", value:"422"}, {label: "YUV 4:4:4", value:"44"}]}>
              <Option value="420">YUV 4:2:0</Option>
              <Option value="422">YUV 4:2:2</Option>
              <Option value="444">YUV 4:4:4</Option>
              </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button>
          </div>
          <div style={{display: 'flex', marginTop: '20px'}}>
          <Select placeholder='Please Select Video Format' size="large" style={{width: '300px'}}></Select>
          <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button>
          </div>
          <div style={{display: 'flex', marginTop: '20px'}}>
          <Select placeholder='Please Select Video Bitrate' size="large" style={{width: '300px'}}></Select>
          <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button>
          </div>
          <div style={{display: 'flex', marginTop: '20px'}}>
          <Select placeholder='Please Select Video Resolution' size="large" style={{width: '300px'}}>Convert video format</Select>
          <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button>
          </div>
          <div style={{display: 'flex', marginTop: '20px'}}>
          <Select placeholder='Please Select Frame Rate' size="large" style={{width: '300px'}}>Convert video resolution</Select>
          <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button>
          </div>
          <div style={{display: 'flex', marginTop: '20px'}}>
          <Select placeholder='Please Select Video Encoding Format' size="large" style={{width: '300px'}}>Convert video encoding format</Select>
          <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Extract video</Button>
          </div>
          </div>
          
      </div>
    );
  }
}

export default Video;
