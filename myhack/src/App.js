import React,{ useState, useEffect} from 'react';
import './render';

const Button = (props) => {

  return (
    <div class={props.class}>
      <button onClick={props.onClick}>
          {props.text}
      </button>
      </div>
  )
}

const App = (props) => {

  const [value,setValue] = useState(0);
  
  

  return (
    <div>
      <h1 >Find my Parking</h1>
      <div class="btn">
      <Button class={"client-btn"} onClick={()=> setValue(value+1) } text={"Find your business"} />
      <Button class={"user-btn"} onClick={()=> setRender(1) } text={"Find your parking"} />
      </div>
    </div>
  );
}

export default App;
