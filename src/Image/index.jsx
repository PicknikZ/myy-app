import React from 'react';
import { Upload, Button, Select } from '@alifd/next';
import { Link } from 'react-router-dom';

const Option = Select.Option;
class Image extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'image',
      step: 1
    };
  }

  handleChange = (v) => {
    this.setState({ mode: v });
  }

  handleClick = (v) => {

  }

  nextStep = () => {
    if (this.state.step === 3) {
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
        <div>1. Change image pixel format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Image Pixel Format' size="large" style={{width: '300px'}}>
              <Option value="420">4:2:0</Option>
              <Option value="422">4:2:2</Option>
              <Option value="444">4:4:4</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Merge images into video</Button></div>
        </div>
      case 2:
        return <div style={{display: 'block'}}>
        <div>2. Convert image format</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Image Format' size="large" style={{width: '300px'}} onSelect={(v)=> console.log(v)}>
              <Option value="bmp">bmp</Option>
              <Option value="jpg">jpg</Option>
              <Option value="png">png</Option>
              <Option value="gif">gif</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Merge images into video</Button></div>
        </div>
      case 3:
        return <div style={{display: 'block'}}>
        <div>3. Convert image resolution</div>
          <div style={{display: 'flex', marginTop: '50px'}}>
            <Select placeholder='Please Select Image Resolution' size="large" style={{width: '300px'}}>
                <Option value="640x360">640x360</Option>
                <Option value="1280x720">1280x720</Option>
                <Option value="1920x1080">1920x1080</Option>
            </Select>
            <Button size="large" style={{marginLeft: '10px'} } onClick={this.handleClick}>Merge images into video</Button></div>
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

export default Image;
