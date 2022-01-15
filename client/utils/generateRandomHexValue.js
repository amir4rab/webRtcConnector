export const generateRandomHexValue = ( length = 16 ) => {
  if ( typeof length !== 'number' ) {
    console.error('Generate Random Hex only accepts Numbers as input!');
    return;
  }
  const randomValueArr = new Uint16Array(Math.floor(length/2 < 128 ? length/2 : 128));
  const hashHex = []; 

  crypto.getRandomValues(randomValueArr);

  randomValueArr.forEach(item => {
    hashHex.push(item.toString(16))
  })

  return hashHex.join('').slice(0, length);
};

export default generateRandomHexValue;