import mongoose,{Schema}from"mongoose";
const line=new Schema({kind:String,productId:String,description:{type:String,required:true},quantity:{type:String,required:true},unit:String,unitPrice:{type:String,required:true}},{_id:false});
const schema=new Schema({proformaNumber:{type:String,required:true,unique:true},company:{type:String,enum:["cana_paints","cana_services"],default:"cana_paints"},client:{name:String,phone:String,email:String,address:String},documentDetails:{issueDate:String,validUntil:String,clientReference:String,paymentTerms:String},notes:String,lines:{type:[line],default:[]},total:{type:Number,default:0}},{timestamps:true});
export default mongoose.models.Proforma||mongoose.model("Proforma",schema);
