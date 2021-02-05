/**
  Licensing

  Copyright 2020 Esri

  Licensed under the Apache License, Version 2.0 (the "License"); You
  may not use this file except in compliance with the License. You may
  obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
  implied. See the License for the specific language governing
  permissions and limitations under the License.

  A copy of the license is available in the repository's
  LICENSE file.
*/
import {React, DataSourceComponent, DataSourceManager, DataSource, IMDataSourceInfo} from 'jimu-core';
import {BaseWidget, AllWidgetProps} from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis';
// import { defaultMessages } from 'jimu-ui';
import defaultMessages from './translations/default';
import {IMConfig} from '../config';
import {ArcGISDataSourceTypes} from 'jimu-arcgis';


import { webMercatorToGeographic } from 'esri/geometry/support/webMercatorUtils';
import Point = require('esri/geometry/Point');

const w3wApi = require("@what3words/api");

interface State{
  extent: __esri.Extent,
  center: __esri.Point,
  w3wAddress: any,
  query: any;
}

export default class Widget extends BaseWidget<AllWidgetProps<IMConfig>, State>{
  extentWatch: __esri.WatchHandle;
  state: State = {
    extent: null,
    center: null,
    w3wAddress: null,
    query: null
  }

  isConfigured = () => {
    return this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1;
  }
  centerWatch: any;

  componentDidMount(){
    w3wApi.setOptions({ key: this.props.config.w3wApiKey });
  }

  componentWillUnmount(){
    if(this.extentWatch){
      this.extentWatch.remove();
      this.extentWatch = null;
    }
  }

  onActiveViewChange = (jimuMapView: JimuMapView) => {
    if(!this.extentWatch){
      this.extentWatch = jimuMapView.view.watch('extent', extent => { 
        this.setState({
          extent
        })
      });
    }
    if(!this.centerWatch){
      this.centerWatch = jimuMapView.view.watch('center', center => { 
        this.setState({
          center
        });
        
        let geoPoint = webMercatorToGeographic(center)as Point;
        w3wApi.convertTo3wa({
          lat: geoPoint.y,
          lng: geoPoint.x
        }).then((w3wAddress: any) => 
          this.setState({
            w3wAddress
          }));
      });
    }
  }


  // #region DataSource
  
  // query = () => {
  //   const fieldName = this.props.useDataSources[0].fields[0];
  //   const w = this.cityNameRef.current && this.cityNameRef.current.value ? 
  //     `${fieldName} like '%${this.cityNameRef.current.value}%'` : '1=1'
  //   this.setState({
  //     query: {
  //       where: w,
  //       outFields: ['*'],
  //       resultRecordCount: 10
  //     }//,
  //     // refresh: true
  //   });
  // }

  dataRender = (ds: DataSource, info: IMDataSourceInfo, count: number) => {
    this.createOutputDs(ds);
    const fName = this.props.useDataSources[0].fields[0];
    return <>
      <div>
        {/* <input placeholder="Query value" ref={this.cityNameRef}/> */}
        <button onClick={this.query}>Query</button>
      </div>
      <div>Query state: {info.status}</div>
      <div>Count: {count}</div>

      {/* <div className="record-list" style={{width: '100%', marginTop: '20px', height: 'calc(100% - 80px)', overflow: 'auto'}}>
        {
          ds && ds.getStatus() === DataSourceStatus.Loaded ? ds.getRecords().map((r, i) => {
            return <div key={i}>{r.getData()[fName]}</div>
          }) : null
        }
      </div> */}
    </>
  }

  createOutputDs(useDs: DataSource){
    console.log("createOutputDs", this.props);
    if(!this.props.outputDataSources){
      return;
    }
    const outputDsId = this.props.outputDataSources[0];
    const dsManager = DataSourceManager.getInstance();
    if(dsManager.getDataSource(outputDsId)){
      if(dsManager.getDataSource(outputDsId).dataSourceJson.originDataSources[0].dataSourceId !== useDs.id){
        dsManager.destroyDataSource(outputDsId);
      }
    }
    dsManager.createDataSource(outputDsId).then(ods => {
      ods.setRecords(useDs.getRecords());
    });
  }

  // #endregion DataSource

  render(){
    if(!this.isConfigured()){
      return 'Select a map';
    }
      
    console.log("render", this.props);
    
    return <div className="widget-use-map-view" style={{width: '100%', height: '100%', overflow: 'hidden'}}>
      <h3>{defaultMessages.w3w}</h3>

      <JimuMapViewComponent useMapWidgetIds={this.props.useMapWidgetIds} onActiveViewChange={this.onActiveViewChange}></JimuMapViewComponent>
      
      <div>{defaultMessages.ll}: // X: {  this.state.extent && this.state.extent.xmin } // Y: {  this.state.extent && this.state.extent.ymin } </div>
      <div>{defaultMessages.center}: // X: {  this.state.center && this.state.center.x } // Y: {  this.state.center && this.state.center.y } </div>
      <div>{defaultMessages.w3w}: ///{ this.state.w3wAddress && this.state.w3wAddress.words } </div>
      {/* <div>{ this.state.extent && JSON.stringify(this.state.extent.toJSON())}</div> */}

      {/* <DataSourceComponent useDataSource={this.props.useDataSources[0]} query={this.state.query} refresh={this.state.refresh} queryCount onQueryStart={() => this.setState({refresh: false})}> */}
      <DataSourceComponent useDataSource={}>
        {
          this.dataRender
        }
      </DataSourceComponent>
    </div>;
  }
}
