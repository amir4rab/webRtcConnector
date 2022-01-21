const verifyInput = ( input, maxLength= 32000 ) => {
  if( typeof input !== 'string' ) return false;

  if( input.length >= maxLength ) return false;

  return true;
}

module.exports = verifyInput;
