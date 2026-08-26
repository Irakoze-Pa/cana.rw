import {
  Package,
  Factory,
  Boxes,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Truck,
} from "lucide-react";




const stats = [

  {
    title:"Total Products",
    value:"120",
    icon:Package,
    description:"Paint products",
  },


  {
    title:"Production",
    value:"24",
    icon:Factory,
    description:"Active batches",
  },


  {
    title:"Inventory",
    value:"85%",
    icon:Boxes,
    description:"Stock availability",
  },


  {
    title:"Orders",
    value:"56",
    icon:ShoppingCart,
    description:"Pending orders",
  },


];





const activities = [

  {
    title:"New customer order received",
    time:"10 minutes ago",
  },


  {
    title:"Production batch completed",
    time:"2 hours ago",
  },


  {
    title:"Low inventory alert",
    time:"Today",
  },


];






function AdminDashboard(){


return (

<div
className="
space-y-8
"
>


{/* HEADER */}

<div>


<h1
className="
text-3xl
font-extrabold
text-black
"
>

Management Dashboard

</h1>


<p
className="
mt-2
text-gray-500
"
>

Monitor CANA Group operations

</p>


</div>







{/* STATISTICS */}


<div

className="
grid
gap-6
sm:grid-cols-2
xl:grid-cols-4
"

>


{

stats.map((item)=>{


const Icon=item.icon;


return (

<div

key={item.title}

className="
rounded-2xl
bg-white
p-6
shadow-sm
border
"

>


<div
className="
flex
items-center
justify-between
"
>


<div>


<p
className="
text-sm
text-gray-500
"
>

{item.title}

</p>



<h2
className="
mt-2
text-3xl
font-bold
"
>

{item.value}

</h2>


<p
className="
mt-1
text-xs
text-gray-400
"
>

{item.description}

</p>


</div>




<div
className="
rounded-xl
bg-red-50
p-3
text-red-600
"
>

<Icon size={26}/>

</div>


</div>


</div>


);


})


}



</div>









{/* MAIN GRID */}


<div

className="
grid
gap-6
lg:grid-cols-3
"

>





{/* SALES */}

<div

className="
lg:col-span-2
rounded-2xl
bg-white
border
p-6
"

>


<div
className="
flex
items-center
gap-3
"
>

<TrendingUp
className="text-red-600"
/>


<h2
className="
text-xl
font-bold
"
>

Sales Overview

</h2>


</div>




<div

className="
mt-6
h-52
flex
items-center
justify-center
rounded-xl
bg-gray-50
text-gray-400
"

>


Chart coming soon


</div>


</div>









{/* QUICK ACTIONS */}


<div

className="
rounded-2xl
bg-white
border
p-6
"

>


<h2
className="
text-xl
font-bold
"
>

Quick Actions

</h2>



<div
className="
mt-5
space-y-3
"
>


<button
className="
flex
w-full
items-center
gap-3
rounded-xl
bg-gray-50
p-3
hover:bg-gray-100
"
>

<Package size={20}/>

Add Product

</button>




<button
className="
flex
w-full
items-center
gap-3
rounded-xl
bg-gray-50
p-3
hover:bg-gray-100
"
>

<Factory size={20}/>

New Production

</button>





<button
className="
flex
w-full
items-center
gap-3
rounded-xl
bg-gray-50
p-3
hover:bg-gray-100
"
>

<Truck size={20}/>

Manage Suppliers

</button>



</div>


</div>



</div>









{/* ACTIVITY */}

<div

className="
rounded-2xl
bg-white
border
p-6
"

>


<div
className="
flex
items-center
gap-3
"
>


<AlertTriangle
className="text-red-600"
/>


<h2
className="
text-xl
font-bold
"
>

Recent Activities

</h2>


</div>





<div

className="
mt-5
space-y-4
"

>


{

activities.map((activity)=>(


<div

key={activity.title}

className="
flex
justify-between
border-b
pb-3
"

>


<div>


<p
className="
font-semibold
"
>

{activity.title}

</p>


<p
className="
text-sm
text-gray-500
"
>

{activity.time}

</p>


</div>



</div>


))


}



</div>



</div>






</div>

);


}



export default AdminDashboard;
