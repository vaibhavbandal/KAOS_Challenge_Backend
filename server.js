import { ApolloServer, gql } from "apollo-server";
import ifsc from 'ifsc';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core'
import fetch from 'cross-fetch';


const accounts = []

const typeDefs = gql`

    type Query{
        accounts:[Account],
        account(id:ID!):Account
    }

    type Account{
        id:ID!
        name:String!
        ifscs:[String!]
        banks:[Bank]
    }

    type Bank{
        ifsc:String
        meta:[Meta]
    }

    type Meta{
        name:String
        branch:String
        city:String
        weather:[Weather]
    }
    
    type Weather{ 
        current:[Current]   
        tomorrow:[Tomorrow]
    }

    type Current{
        temperature:Int
        comment:String
    }
    type Tomorrow{
        min:Int
        max:Int
    }

    type Mutation {
        create_account(name:String!,ifscs:[String!]): ID 
    }

`
const resolvers = {
    Query: {
        accounts: async () => {
            let data = [];
            let bankData = [];
            for (const account of accounts) {

                for (const ifscCode of account.ifscs) {
                    const ifscData = await ifsc.fetchDetails(ifscCode);

                    const weatherResponse = await fetch('https://weatherdbi.herokuapp.com/data/weather/london')
                    const weatherData = await weatherResponse.json();
                    console.info(weatherData.next_days[1]);

                    let data = {
                        ifsc: ifscCode,
                        meta: [{
                            name: ifscData.BANK,
                            branch: ifscData.BRANCH,
                            city: ifscData.CITY,
                            weather: [{
                                current: [{
                                    temperature: weatherData.currentConditions.temp.c,
                                    comment: weatherData.currentConditions.comment,
                                }],
                                tomorrow: [{
                                    min: weatherData.next_days[1].min_temp.c,
                                    max: weatherData.next_days[1].max_temp.c

                                }]

                            }],
                        }]
                    }

                    bankData.push(data);
                }
            }

            for (let i = 0; i < accounts.length; i++) {
                let preparedData = {
                    id: accounts[i].id,
                    name: accounts[i].name,
                    banks: bankData
                }

                data.push(preparedData);
            }
            return data;
        },


        account: async (_, args) => {
            const account = accounts.find(({ id }) => id == args.id)
            let data = [];
            let bankData = [];

            for (const ifscCode of account.ifscs) {

                const ifscData = await ifsc.fetchDetails(ifscCode);

                const weatherResponse = await fetch('https://weatherdbi.herokuapp.com/data/weather/london')
                const weatherData = await weatherResponse.json();

                let data = {
                    ifsc: ifscCode,
                    meta: [{
                        name: ifscData.BANK,
                        branch: ifscData.BRANCH,
                        city: ifscData.CITY,
                        weather: [{
                            current: [{
                                temperature: weatherData.currentConditions.temp.c,
                                comment: weatherData.currentConditions.comment,
                            }],
                            tomorrow: [{
                                min: weatherData.next_days[1].min_temp.c,
                                max: weatherData.next_days[1].max_temp.c

                            }]

                        }],
                    }]
                }

                bankData.push(data);

            }

            let preparedData = {
                id: account.id,
                name: account.name,
                banks: bankData
            }

            return preparedData;

        }


    },
    Mutation: {
        create_account: async (_, account) => {
            account.id = accounts.length + 1
            accounts.push(account);
            return account.id
        }
    }

}

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolvers,
    plugins: [
        ApolloServerPluginLandingPageGraphQLPlayground
    ]
})

server.listen(3000).then(({ url }) => {
    console.info(url);
})