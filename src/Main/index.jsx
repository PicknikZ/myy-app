import React from 'react';
import { Upload, Button, Select } from '@alifd/next';
import { Link } from 'react-router-dom';

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'video',
    };
  }

  handleChange = (v) => {
    this.setState({ mode: v });
  }

  onVideoSuccess = (file, value) => {
    window.location.href = `/video?uid=${file.response.uid}`
  };

  onError = (file, value) => {
    console.log('file : ', file);
    console.log('value : ', value);
  };

  render() {
    return (
      <div >
       <div>
       <Select
          size='large'
          style={{width: '300px'}}
          onChange={this.handleChange}
          defaultValue="video"
          dataSource={[
            { value: 'video', label: 'Upload Video' },
            { value: 'image', label: 'Upload Image' },
          ]}
        />
       </div>
        <div style={{height: '100px'}}></div>
        {this.state.mode === 'video' ? (
          <div>
            <Upload
            listType='text'
            limit={1}
            accept="video/*"
            action="http://127.0.0.1:8080/uploadVideo"
            // beforeUpload={beforeUpload}
            // onChange={onChange}
            onSuccess={this.onVideoSuccess}
            onError={this.onError}
            key="1"
            >
      <Button type="primary" style={{ margin: '0 0 10px' }}>
        Upload Video
      </Button>
    </Upload>
          </div>
        ) : (
          <div><Upload
          listType='text'
          accept="image/*"
          action="http://127.0.0.1:8080/uploadImage"
          // beforeUpload={beforeUpload}
          // onChange={onChange}
          onSuccess={this.onSuccess}
          onError={this.onError}
          key="1"
          >
          <Button type="primary" style={{ margin: '0 0 10px' }}>
            Upload Image
          </Button>
        </Upload>
          </div>
        )}
        {/* <div style={{marginTop: '50px'}}><Link to={this.state.mode}>Next Step</Link></div> */}
      </div>
    );
  }
}

export default Main;
