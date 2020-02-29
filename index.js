const sequelize = require('./database');
Object.values(require('./app/models')).map(x => x)
async function start(){
  try {
    await sequelize.sync()
    require('./app/bot')
  } catch (error) {
    console.log(error);
  }
}

start()
